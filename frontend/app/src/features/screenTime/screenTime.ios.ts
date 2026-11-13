// Screen Time for the screen_time integration. iOS never hands an app a usage
// total: the ScreenTimeMonitor extension is woken as each usage threshold is
// crossed and records the day's highest one in the shared App Group (see
// modules/screen-time). This reads those per-day totals through the native
// module and posts them, each replacing that day's stored total, so a sync can
// always safely re-send everything recorded. The extension posts recent days
// itself as they accrue, with a token of its own that each sync keeps fresh
// (see renewExtensionToken).

import { requireOptionalNativeModule } from "expo"
import {
    type ApiConfig,
    importScreenTime,
    screenTimeToken
} from "@shared/index"
import type { ScreenTimeStatus } from "./screenTime"

interface BeaccScreenTime {
    authorizationStatus(): "approved" | "denied" | "notDetermined"
    requestAuthorization(): Promise<void>
    hasSelection(): boolean
    pickActivities(): Promise<boolean>
    startMonitoring(): void
    ensureMonitoring(): void
    isMonitoring(): boolean
    stopMonitoring(): void
    /** Recorded days as local "yyyy-MM-dd" dates. */
    readDays(): { date: string; minutes: number }[]
    lastEventAt(): number | null
    setSession(apiUrl: string, token: string | null): void
    clear(): void
}

/** Missing in Expo Go and builds made before the module existed. */
const native = requireOptionalNativeModule<BeaccScreenTime>("BeaccScreenTime")

/** Most days the backend accepts per import call. */
const IMPORT_PAGE = 400

export function isScreenTimeSupported(): boolean {
    return native !== null
}

/**
 * Whether Screen Time is set up: apps picked and the monitor running. Right
 * after launch or an update, iOS can report access as "notDetermined" for a
 * moment before it loads the real answer, so only an outright "denied" counts
 * against it; a running monitor already proves access was granted.
 */
export function isScreenTimeConnected(): boolean {
    return (
        native !== null &&
        native.authorizationStatus() !== "denied" &&
        native.hasSelection() &&
        native.isMonitoring()
    )
}

/**
 * Ask for Screen Time access (iOS shows its own Face ID / passcode prompt),
 * have the user pick what counts, then start the daily monitor. Resolves false
 * if the picker was cancelled; throws if access was declined.
 */
export async function connectScreenTime(): Promise<boolean> {
    if (!native) throw new Error("Screen Time isn't available on this device.")
    if (native.authorizationStatus() !== "approved")
        await native.requestAuthorization()
    if (!native.hasSelection() && !(await native.pickActivities())) return false
    native.startMonitoring()
    return true
}

export async function chooseScreenTimeApps(): Promise<boolean> {
    if (!native) return false
    if (!(await native.pickActivities())) return false
    native.startMonitoring()
    return true
}

/** Restart the monitor if an older build started it with different events. */
export function ensureScreenTimeMonitoring(): void {
    native?.ensureMonitoring()
}

/**
 * What the phone has recorded: today's total, and when the monitor extension
 * last reported (null if it never has, i.e. iOS hasn't woken it yet).
 */
export function screenTimeStatus(): ScreenTimeStatus {
    if (!native) return { todayMinutes: null, lastEventAt: null }
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const day = native.readDays().find((d) => d.date === today)
    return {
        todayMinutes: day?.minutes ?? null,
        lastEventAt: native.lastEventAt()
    }
}

export function forgetScreenTime(): void {
    native?.clear()
    tokenRenewedAt = 0
}

/** The extension's token lasts 30 days; it's replaced once it's this old. */
const TOKEN_RENEW_MS = 86_400_000

/** When this launch last gave the extension a token; 0 if it hasn't. */
let tokenRenewedAt = 0

/**
 * Give the monitor extension a token to post totals with. It can't sign in, so
 * the backend issues one that only imports screen time and lasts long enough
 * to outlive stretches of the app never running. Fetched once per launch and
 * daily after that; on failure the extension keeps whatever it had.
 */
async function renewExtensionToken(api: ApiConfig): Promise<void> {
    if (!native || Date.now() - tokenRenewedAt < TOKEN_RENEW_MS) return
    try {
        const { token } = await screenTimeToken(api)
        native.setSession(api.baseUrl.replace(/\/$/, ""), token)
        tokenRenewedAt = Date.now()
    } catch {
        // Offline, or a backend without the endpoint; the app's own syncs still post.
    }
}

/** Local noon of a "yyyy-MM-dd" date, which the backend files under that day. */
function localNoon(date: string): number {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d, 12).getTime()
}

export async function syncScreenTime(api: ApiConfig): Promise<number> {
    if (!native) return 0
    await renewExtensionToken(api)
    const now = Date.now()
    const days = native
        .readDays()
        .map(({ date, minutes }) => ({ day: localNoon(date), minutes }))
        .filter(({ day }) => day <= now + 86_400_000)
    let changed = 0
    for (let i = 0; i < days.length; i += IMPORT_PAGE) {
        const { imported } = await importScreenTime(
            api,
            days.slice(i, i + IMPORT_PAGE)
        )
        changed += imported
    }
    return changed
}
