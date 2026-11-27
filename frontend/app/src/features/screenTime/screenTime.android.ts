// Screen time on Android: the phone's total foreground time per day, read from
// the system's usage log by the BeaccScreenTime module
// (modules/screen-time/android). Every app counts; there's no picker as on iOS.
//
// The user grants Usage access in Android Settings, which can't be revoked from
// here, so "connected" is access plus Beacc's own on/off flag: disconnecting (or
// signing out) turns the flag off. Syncs read the log directly, in the app and
// from the periodic background task; there's no monitor extension.

import { AppState } from "react-native"
import { requireOptionalNativeModule } from "expo"
import * as SecureStore from "expo-secure-store"
import { type ApiConfig, importScreenTime } from "@shared/index"
import type { ScreenTimeStatus } from "./screenTime"

interface BeaccScreenTime {
    hasAccess(): boolean
    openAccessSettings(): boolean
    /** Recorded days as local "yyyy-MM-dd" dates, oldest first. */
    readDays(days: number): {
        days: { date: string; minutes: number }[]
        lastEventAt: number | null
    }
}

/** Missing in Expo Go and builds made before the module existed. */
const native = requireOptionalNativeModule<BeaccScreenTime>("BeaccScreenTime")

/** "1" while connected. Kept apart from Usage access, which only Settings can revoke. */
const CONNECTED_KEY = "accountable_screen_time_android"

/**
 * How many days each sync reads. Android keeps about a week of usage events;
 * days the log doesn't fully cover are left out (see readDays), so asking for
 * more is harmless.
 */
const DAYS = 10

/** How long to wait for the user to come back from Settings with access granted. */
const ACCESS_WAIT_MS = 5 * 60_000

function readFlag(): boolean {
    try {
        return SecureStore.getItem(CONNECTED_KEY) === "1"
    } catch {
        return false
    }
}

function writeFlag(on: boolean): void {
    try {
        if (on) SecureStore.setItem(CONNECTED_KEY, "1")
        else void SecureStore.deleteItemAsync(CONNECTED_KEY)
    } catch {
        // Losing it only means connecting again.
    }
}

export function isScreenTimeSupported(): boolean {
    return native !== null
}

export function isScreenTimeConnected(): boolean {
    return native !== null && readFlag() && native.hasAccess()
}

/** Resolves once the app is back in the foreground. */
function nextReturnToApp(): Promise<void> {
    return new Promise((resolve) => {
        let left = AppState.currentState !== "active"
        const sub = AppState.addEventListener("change", (state) => {
            if (state !== "active") left = true
            else if (left) finish()
        })
        const timer = setTimeout(finish, ACCESS_WAIT_MS)
        function finish() {
            clearTimeout(timer)
            sub.remove()
            resolve()
        }
    })
}

/**
 * Connect: if Usage access isn't granted yet, open its settings page and wait
 * for the user to come back. Resolves false if they come back without granting
 * it, like cancelling the iOS picker.
 */
export async function connectScreenTime(): Promise<boolean> {
    if (!native) throw new Error("Screen time isn't available on this device.")
    if (!native.hasAccess()) {
        if (!native.openAccessSettings())
            throw new Error(
                "Couldn't open Usage access settings. Allow Beacc there, then connect again."
            )
        await nextReturnToApp()
        if (!native.hasAccess()) return false
    }
    writeFlag(true)
    return true
}

/** Every app counts on Android, so there's nothing to choose. */
export async function chooseScreenTimeApps(): Promise<boolean> {
    return false
}

export function ensureScreenTimeMonitoring(): void {}

function today(): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function screenTimeStatus(): ScreenTimeStatus {
    if (!native || !isScreenTimeConnected())
        return { todayMinutes: null, lastEventAt: null }
    const { days, lastEventAt } = native.readDays(1)
    return {
        todayMinutes: days.find((d) => d.date === today())?.minutes ?? null,
        lastEventAt
    }
}

/** Turn Beacc's tracking off. Usage access itself stays until the user revokes it in Settings. */
export function forgetScreenTime(): void {
    writeFlag(false)
}

/** Local noon of a "yyyy-MM-dd" date, which the backend files under that day. */
function localNoon(date: string): number {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d, 12).getTime()
}

export async function syncScreenTime(api: ApiConfig): Promise<number> {
    if (!native || !isScreenTimeConnected()) return 0
    const days = native
        .readDays(DAYS)
        .days.map(({ date, minutes }) => ({ day: localNoon(date), minutes }))
    if (days.length === 0) return 0
    const { imported } = await importScreenTime(api, days)
    return imported
}
