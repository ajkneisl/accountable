// HealthKit access for the Apple Health integration. Workouts are read on the
// device and posted to the backend's import endpoint, which dedupes them by
// HealthKit UUID, so a sync can always safely re-send an overlapping window.

import { isRunningInExpoGo } from "expo"
import {
    type ApiConfig,
    type ImportedWorkout,
    type WorkoutType,
    importWorkouts
} from "@shared/index"

type HealthKit = typeof import("@kingstinct/react-native-healthkit")

/** Most workouts the backend accepts per import call. */
const IMPORT_PAGE = 500

let healthKit: HealthKit | null | undefined

/**
 * The HealthKit module, or null where it can't run. Expo Go doesn't include it,
 * and touching it there throws, so it's loaded on demand.
 */
function getHealthKit(): HealthKit | null {
    if (healthKit === undefined) {
        try {
            healthKit = isRunningInExpoGo()
                ? null
                : (require("@kingstinct/react-native-healthkit") as HealthKit)
            if (healthKit && !healthKit.isHealthDataAvailable())
                healthKit = null
        } catch {
            healthKit = null
        }
    }
    return healthKit
}

export function isAppleHealthSupported(): boolean {
    return getHealthKit() !== null
}

/**
 * Show the HealthKit permission sheet. iOS never reveals whether read access was
 * granted — a denied type simply returns no samples — so this can't fail on a
 * "no"; the sheet is only shown the first time.
 */
export async function requestAppleHealthAccess(): Promise<void> {
    const hk = getHealthKit()
    if (!hk) throw new Error("Apple Health isn't available on this device.")
    await hk.requestAuthorization({
        toRead: [
            "HKWorkoutTypeIdentifier",
            "HKQuantityTypeIdentifierActiveEnergyBurned"
        ]
    })
}

const WORKOUTS = "HKWorkoutTypeIdentifier"

/**
 * Have iOS wake the app whenever a workout is saved to Health, even after it was
 * terminated. The native observer is registered at launch from persisted config,
 * so this only needs calling once per connect (repeating it is harmless).
 */
export async function enableBackgroundSync(): Promise<void> {
    const hk = getHealthKit()
    if (!hk) return
    await hk.configureBackgroundTypes([WORKOUTS], hk.UpdateFrequency.immediate)
}

export async function disableBackgroundSync(): Promise<void> {
    await getHealthKit()?.clearBackgroundTypes()
}

/**
 * Call [onChange] when Health's workouts change — including the event that woke
 * the app in the background, which the native side holds until JS subscribes.
 */
export function onWorkoutsChanged(onChange: () => void): () => void {
    const hk = getHealthKit()
    if (!hk) return () => {}
    const sub = hk.subscribeToChanges(WORKOUTS, () => onChange())
    return () => void sub.remove()
}

/** HealthKit activity → the backend's coarse workout types. */
function workoutType(hk: HealthKit, activity: number): WorkoutType {
    const t = hk.WorkoutActivityType
    switch (activity) {
        case t.running:
            return "RUN"
        case t.traditionalStrengthTraining:
        case t.functionalStrengthTraining:
            return "WEIGHTLIFTING"
        case t.basketball:
            return "BASKETBALL"
        case t.pickleball:
            return "PICKLEBALL"
        default:
            return "OTHER"
    }
}

function minutes(q: { unit: string; quantity: number }): number {
    switch (q.unit) {
        case "min":
            return q.quantity
        case "hr":
            return q.quantity * 60
        default:
            return q.quantity / 60
    }
}

function kilocalories(q?: { unit: string; quantity: number }): number {
    if (!q) return 0
    return q.unit === "J"
        ? q.quantity / 4184
        : q.unit === "kJ"
          ? q.quantity / 4.184
          : q.quantity
}

export async function syncAppleHealthWorkouts(
    api: ApiConfig,
    since: number
): Promise<number> {
    const hk = getHealthKit()
    if (!hk) return 0

    const proxies = await hk.queryWorkoutSamples({
        limit: 0,
        ascending: true,
        filter: { date: { startDate: new Date(since) } }
    })

    // Copy each proxy to plain data and release the native HKWorkout right away.
    const workouts: ImportedWorkout[] = proxies.map((proxy) => {
        const w = proxy.toJSON()
        proxy.dispose()
        return {
            externalID: w.uuid,
            type: workoutType(hk, w.workoutActivityType),
            durationMin: Math.round(minutes(w.duration)),
            calories: Math.round(kilocalories(w.totalEnergyBurned)),
            happenedAt: new Date(w.startDate).getTime()
        }
    })

    let imported = 0
    for (let i = 0; i < workouts.length; i += IMPORT_PAGE) {
        const res = await importWorkouts(
            api,
            workouts.slice(i, i + IMPORT_PAGE)
        )
        imported += res.imported
    }
    return imported
}
