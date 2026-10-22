// Apple Health exists only on iOS (see appleHealth.ios.ts). Elsewhere it's
// reported as unsupported and every action is a no-op.

import type { ApiConfig } from "@shared/index"

export function isAppleHealthSupported(): boolean {
    return false
}

export async function requestAppleHealthAccess(): Promise<void> {}

/** Have iOS wake the app whenever a workout is saved to Health. */
export async function enableBackgroundSync(): Promise<void> {}

export async function disableBackgroundSync(): Promise<void> {}

/** Call [onChange] when Health's workouts change. Returns an unsubscribe. */
export function onWorkoutsChanged(_onChange: () => void): () => void {
    return () => {}
}

/** Import workouts since [since] (ms epoch). Resolves to how many were new. */
export async function syncAppleHealthWorkouts(
    _api: ApiConfig,
    _since: number
): Promise<number> {
    return 0
}
