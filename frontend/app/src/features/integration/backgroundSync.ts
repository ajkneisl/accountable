// Periodic background sync for the device-local integrations. iOS runs the task
// when it sees fit (often only a few times a day, less for an app that's rarely
// opened), so it's a catch-all behind the HealthKit wakes and foreground syncs,
// not a schedule. It may run with no UI mounted, so it signs in from the
// keychain itself and skips anything that isn't linked.
//
// The task has to be defined when the JS bundle loads, before iOS hands it the
// work, so the root layout imports this module.

import * as BackgroundTask from "expo-background-task"
import * as TaskManager from "expo-task-manager"
import { apiConfig, hydrateSession } from "../../auth"
import { syncAppleHealthInBackground } from "../health/AppleHealthData"
import { syncScreenTimeInBackground } from "../screenTime/ScreenTimeData"

const TASK = "beacc-integrations-sync"

/** iOS treats this as a floor and usually waits much longer. */
const MINIMUM_INTERVAL_MIN = 60

TaskManager.defineTask(TASK, async () => {
    if (!(await hydrateSession()))
        return BackgroundTask.BackgroundTaskResult.Success
    // Settled separately, so one integration failing doesn't skip the other.
    const results = await Promise.allSettled([
        syncAppleHealthInBackground(apiConfig),
        syncScreenTimeInBackground(apiConfig)
    ])
    return results.some((r) => r.status === "rejected")
        ? BackgroundTask.BackgroundTaskResult.Failed
        : BackgroundTask.BackgroundTaskResult.Success
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
