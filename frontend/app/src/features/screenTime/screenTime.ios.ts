// Screen Time for the screen_time integration. iOS never hands an app a usage
// total: the ScreenTimeMonitor extension is woken as each usage threshold is
// crossed and records the day's highest one in the shared App Group (see
// modules/screen-time). This reads those per-day totals through the native
// module and posts them, each replacing that day's stored total, so a sync can
// always safely re-send everything recorded.

import { requireOptionalNativeModule } from "expo"
import { type ApiConfig, importScreenTime } from "@shared/index"

interface BeaccScreenTime {
    authorizationStatus(): "approved" | "denied" | "notDetermined"
    requestAuthorization(): Promise<void>
    hasSelection(): boolean
    pickActivities(): Promise<boolean>
    startMonitoring(): void
    isMonitoring(): boolean
    stopMonitoring(): void
    /** Recorded days as local "yyyy-MM-dd" dates. */
    readDays(): { date: string; minutes: number }[]
    clear(): void
}

/** Missing in Expo Go and builds made before the module existed. */
const native = requireOptionalNativeModule<BeaccScreenTime>("BeaccScreenTime")

/** Most days the backend accepts per import call. */
const IMPORT_PAGE = 400

export function isScreenTimeSupported(): boolean {
    return native !== null
}

export function isScreenTimeConnected(): boolean {
    return (
        native !== null &&
        native.authorizationStatus() === "approved" &&
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

export function forgetScreenTime(): void {
    native?.clear()
}

/** Local noon of a "yyyy-MM-dd" date, which the backend files under that day. */
function localNoon(date: string): number {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d, 12).getTime()
}

export async function syncScreenTime(api: ApiConfig): Promise<number> {
    if (!native) return 0
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
