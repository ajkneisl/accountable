// Apple Health exists only on iOS (see appleHealth.ios.ts). Elsewhere it's
// reported as unsupported and every action is a no-op.

import type { ApiConfig } from "@shared/index"

export function isAppleHealthSupported(): boolean {
    return false
}

export async function requestAppleHealthAccess(): Promise<void> {}

/** Have iOS wake the app whenever a workout or sleep is saved to Health. */
export async function enableBackgroundSync(): Promise<void> {}

export async function disableBackgroundSync(): Promise<void> {}

/** Call [onChange] when Health's workouts or sleep change. Returns an unsubscribe. */
export function onHealthDataChanged(_onChange: () => void): () => void {
    return () => {}
}

/** Import workouts since [since] (ms epoch). Resolves to how many were new. */
export async function syncAppleHealthWorkouts(
    _api: ApiConfig,
    _since: number
): Promise<number> {
    return 0
}

/** Import per-day sleep totals since [since] (ms epoch). Resolves to how many days were written. */
export async function syncAppleHealthSleep(
    _api: ApiConfig,
    _since: number
): Promise<number> {
    return 0
}
