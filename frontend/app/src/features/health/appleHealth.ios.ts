// HealthKit access for the Apple Health integration. Workouts are read on the
// device and posted to the backend's import endpoint, which dedupes them by
// HealthKit UUID, so a sync can always safely re-send an overlapping window.
// Sleep is totalled per day on the device and posted as one figure per day,
// which replaces that day's stored total — so it's just as safe to re-send.
// Steps work the same way, with HealthKit doing the per-day totalling.

import { isRunningInExpoGo } from "expo"
import {
    type ApiConfig,
    type ImportedSleepDay,
    type ImportedStepsDay,
    type ImportedWorkout,
    type WorkoutType,
    importSleep,
    importSteps,
    importWorkouts
} from "@shared/index"

type HealthKit = typeof import("@kingstinct/react-native-healthkit")

const WORKOUTS = "HKWorkoutTypeIdentifier" as const
const SLEEP = "HKCategoryTypeIdentifierSleepAnalysis" as const
const STEPS = "HKQuantityTypeIdentifierStepCount" as const
const READ_TYPES = [
    WORKOUTS,
    "HKQuantityTypeIdentifierActiveEnergyBurned",
    SLEEP,
    STEPS
] as const

/** Most workouts the backend accepts per import call. */
const IMPORT_PAGE = 500

/** Most sleep (or step) days the backend accepts per import call. */
const SLEEP_IMPORT_PAGE = 400

/** The backend's per-day step cap; anything above is junk data. */
const MAX_STEPS_PER_DAY = 250_000

const DAY_MS = 86_400_000

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
    await hk.requestAuthorization({ toRead: [...READ_TYPES] })
}

/**
 * Whether the permission sheet has already been answered for every type we read.
 * iOS won't say whether access was granted, so this is the closest it gets to
 * "connected" — it survives anything that wipes the app's own stored flag.
 */
export async function hasRequestedAppleHealthAccess(): Promise<boolean> {
    const hk = getHealthKit()
    if (!hk) return false
    try {
        const status = await hk.getRequestStatusForAuthorization({
            toRead: [...READ_TYPES]
        })
        return status === hk.AuthorizationRequestStatus.unnecessary
    } catch {
        return false
    }
}

/**
 * Have iOS wake the app whenever a workout or sleep is saved to Health, even
 * after it was terminated. The native observer is registered at launch from persisted config,
 * so this only needs calling once per connect (repeating it is harmless).
 */
export async function enableBackgroundSync(): Promise<void> {
    const hk = getHealthKit()
    if (!hk) return
    await hk.configureBackgroundTypes(
        [WORKOUTS, SLEEP],
        hk.UpdateFrequency.immediate
    )
}

export async function disableBackgroundSync(): Promise<void> {
    await getHealthKit()?.clearBackgroundTypes()
}

/**
 * Call [onChange] when Health's workouts or sleep change — including the event
 * that woke the app in the background, which the native side holds until JS
 * subscribes.
 */
export function onHealthDataChanged(onChange: () => void): () => void {
    const hk = getHealthKit()
    if (!hk) return () => {}
    const subs = [WORKOUTS, SLEEP].map((type) =>
        hk.subscribeToChanges(type, () => onChange())
    )
    return () => subs.forEach((sub) => void sub.remove())
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

type Span = [start: number, end: number]

/** Merge overlapping spans, so sleep recorded by both a watch and a phone counts once. */
function mergeSpans(spans: Span[]): Span[] {
    const merged: Span[] = []
    for (const [start, end] of [...spans].sort((a, b) => a[0] - b[0])) {
        const last = merged[merged.length - 1]
        if (last && start <= last[1]) last[1] = Math.max(last[1], end)
        else merged.push([start, end])
    }
    return merged
}

/** Local midnight of the day containing [ms]. */
function localDayStart(ms: number): number {
    const d = new Date(ms)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * Minutes per local day across [spans], keyed by local midnight. Each span counts
 * toward the day it ended on, so a night's sleep belongs to the morning after.
 */
function minutesByDay(spans: Span[]): Map<number, ImportedSleepDay> {
    const days = new Map<number, ImportedSleepDay>()
    for (const [start, end] of mergeSpans(spans)) {
        const day = localDayStart(end)
        const total = days.get(day) ?? { endedAt: end, minutes: 0 }
        total.minutes += (end - start) / 60_000
        total.endedAt = Math.max(total.endedAt, end)
        days.set(day, total)
    }
    return days
}

/**
 * Import per-day sleep totals for every day from [since] (ms epoch) on. Resolves
 * to how many days were written. Counts time asleep (any stage); a day with no
 * asleep samples falls back to time in bed, which is all an iPhone without a
 * watch records.
 */
export async function syncAppleHealthSleep(
    api: ApiConfig,
    since: number
): Promise<number> {
    const hk = getHealthKit()
    if (!hk) return 0

    // Start a day early so a night already under way at [since] is read whole.
    const samples = await hk.queryCategorySamples(SLEEP, {
        limit: 0,
        ascending: true,
        filter: { date: { startDate: new Date(since - DAY_MS) } }
    })

    const stage = hk.CategoryValueSleepAnalysis
    const asleep: Span[] = []
    const inBed: Span[] = []
    for (const s of samples) {
        const span: Span = [
            new Date(s.startDate).getTime(),
            new Date(s.endDate).getTime()
        ]
        if (s.value === stage.inBed) inBed.push(span)
        else if (s.value !== stage.awake) asleep.push(span)
    }

    // Asleep totals win over in-bed ones for any day that has both.
    const totals = new Map([...minutesByDay(inBed), ...minutesByDay(asleep)])
    const firstDay = localDayStart(since)
    const days = [...totals]
        .filter(([day]) => day >= firstDay)
        .map(([, t]) => ({
            endedAt: t.endedAt,
            minutes: Math.min(24 * 60, Math.round(t.minutes))
        }))

    let imported = 0
    for (let i = 0; i < days.length; i += SLEEP_IMPORT_PAGE) {
        const res = await importSleep(api, days.slice(i, i + SLEEP_IMPORT_PAGE))
        imported += res.imported
    }
    return imported
}

/**
 * Import per-day step totals for every day from [since] (ms epoch) on. Resolves
 * to how many days were written. HealthKit's cumulative sum dedupes steps a
 * watch and phone both counted, so each day's figure is already its total.
 */
export async function syncAppleHealthSteps(
    api: ApiConfig,
    since: number
): Promise<number> {
    const hk = getHealthKit()
    if (!hk) return 0

    const firstDay = localDayStart(since)
    const stats = await hk.queryStatisticsCollectionForQuantity(
        STEPS,
        ["cumulativeSum"],
        new Date(firstDay),
        { day: 1 },
        { filter: { date: { startDate: new Date(firstDay) } }, unit: "count" }
    )

    const days: ImportedStepsDay[] = []
    for (const s of stats) {
        if (!s.startDate) continue
        const start = localDayStart(new Date(s.startDate).getTime())
        if (start < firstDay) continue
        days.push({
            // Local noon, so a few hours' gap to the account's zone keeps the date.
            day: start + DAY_MS / 2,
            steps: Math.min(
                MAX_STEPS_PER_DAY,
                Math.round(s.sumQuantity?.quantity ?? 0)
            )
        })
    }

    let imported = 0
    for (let i = 0; i < days.length; i += SLEEP_IMPORT_PAGE) {
        const res = await importSteps(api, days.slice(i, i + SLEEP_IMPORT_PAGE))
        imported += res.imported
    }
    return imported
}
