// Background sync for the device-local integrations, for when iOS runs the app
// with no UI mounted. Two things start one:
//   - a HealthKit wake: a workout or sleep was saved, or (hourly at most) steps
//     were taken. This is the timely one, and Screen Time rides along on it.
//   - the periodic task, which iOS runs when it sees fit (often only a few
//     times a day, less for an app that's rarely opened): a catch-all, not a
//     schedule.
// Either way the sync signs in from the keychain itself and skips anything
// that isn't linked.
//
// Both have to be set up when the JS bundle loads, before iOS hands over the
// work, so the app entry (index.ts) imports this module.

import { AppState } from "react-native"
import * as BackgroundTask from "expo-background-task"
import * as TaskManager from "expo-task-manager"
import { apiConfig, hydrateSession, tokenStore } from "../../auth"
import {
    syncAppleHealthInBackground,
    watchAppleHealth
} from "../health/AppleHealthData"
import { syncScreenTimeInBackground } from "../screenTime/ScreenTimeData"
import { isSyncRunning } from "./syncGuard"

const TASK = "beacc-integrations-sync"

/** iOS treats this as a floor and usually waits much longer. */
const MINIMUM_INTERVAL_MIN = 60

/** A steps wake within this long of the last sync is skipped. */
const STEPS_STALE_MS = 5 * 60_000

/** Sync everything linked. Resolves to whether all of it went through. */
async function syncAll(): Promise<boolean> {
    // With the UI up there's a session in memory already, at least as new as
    // the keychain's; otherwise this is a launch with no UI, so load it.
    if (tokenStore.getAccess() === null && !(await hydrateSession()))
        return true
    // Settled separately, so one integration failing doesn't skip the other.
    const results = await Promise.allSettled([
        syncAppleHealthInBackground(apiConfig),
        syncScreenTimeInBackground(apiConfig)
    ])
    return results.every((r) => r.status === "fulfilled")
}

TaskManager.defineTask(TASK, async () =>
    (await syncAll())
        ? BackgroundTask.BackgroundTaskResult.Success
        : BackgroundTask.BackgroundTaskResult.Failed
)

/** When the wake sync now running started, or null. */
let syncStarted: number | null = null
/** When a wake sync last went through. */
let lastSync = 0

// HealthKit wakes with no UI mounted; with one, AppleHealthProvider handles them.
// A cold launch delivers every type's change at once, which is one sync.
void watchAppleHealth((change) => {
    // Opening the app also delivers a change, before the provider is up to take
    // it. That's not a wake: the provider syncs as it mounts.
    const state = AppState.currentState
    if (state === "active" || state === "inactive") return
    if (isSyncRunning(syncStarted)) return
    const started = Date.now()
    if (change === "steps" && started - lastSync <= STEPS_STALE_MS) return
    syncStarted = started
    void syncAll()
        .catch(() => false)
        .then((synced) => {
            // A failed sync (say, Health is locked) doesn't hold off the next.
            if (synced) lastSync = Date.now()
            if (syncStarted === started) syncStarted = null
        })
}).catch(() => {
    // HealthKit wouldn't subscribe; the periodic task and foreground syncs remain.
})

/** Schedule the task; repeating it is harmless. */
export async function registerBackgroundSync(): Promise<void> {
    try {
        const status = await BackgroundTask.getStatusAsync()
        if (status !== BackgroundTask.BackgroundTaskStatus.Available) return
        await BackgroundTask.registerTaskAsync(TASK, {
            minimumInterval: MINIMUM_INTERVAL_MIN
        })
    } catch {
        // Not available (e.g. Expo Go); foreground syncs still cover it.
    }
}
