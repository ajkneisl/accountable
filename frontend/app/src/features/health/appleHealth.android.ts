// Health Connect access: the Android side of the Apple Health integration (see
// appleHealth.ios.ts). It feeds the same backend integrations and import
// endpoints, so goals and competitions count an Android member's steps, sleep
// and workouts exactly as they count an iPhone's.
//
// Unlike HealthKit, Health Connect can't wake the app when data changes, so
// there's no change subscription here: data syncs when the app opens and from
// the periodic background task (see integration/backgroundSync), which needs
// the separate "read in background" permission asked for alongside the rest.

import { Linking } from "react-native"
import { isRunningInExpoGo } from "expo"
import {
    type ApiConfig,
    type ImportedDistanceDay,
    type ImportedStepsDay,
    type ImportedWorkout,
    type WorkoutType,
    importDistance,
    importSleep,
    importSteps,
    importWorkouts
} from "@shared/index"
import {
    DAY_IMPORT_PAGE,
    DAY_MS,
    IMPORT_PAGE,
    MAX_METERS_PER_DAY,
    MAX_STEPS_PER_DAY,
    type Span,
    importInPages,
    localDayStart,
    sleepDays
} from "./days"

type HealthConnect = typeof import("react-native-health-connect")

/** Health Connect's Play Store listing, for phones (Android 13 and older) that don't have it built in. */
const PLAY_STORE_URL = "market://details?id=com.google.android.apps.healthdata"

const READ_TYPES = [
    "Steps",
    "Distance",
    "SleepSession",
    "ExerciseSession",
    "ActiveCaloriesBurned"
] as const

let healthConnect: HealthConnect | null | undefined

/** The Health Connect module, or null where it can't load (Expo Go). */
function getHealthConnect(): HealthConnect | null {
    if (healthConnect === undefined) {
        try {
            healthConnect = isRunningInExpoGo()
                ? null
                : (require("react-native-health-connect") as HealthConnect)
        } catch {
            healthConnect = null
        }
    }
    return healthConnect
}

let initialized: Promise<boolean> | null = null

/**
 * The module once Health Connect is installed and its client is set up, or
 * null. Every JS context (the UI, a background task) has to initialize once.
 */
async function ready(): Promise<HealthConnect | null> {
    const hc = getHealthConnect()
    if (!hc) return null
    initialized ??= (async () => {
        const status = await hc.getSdkStatus()
        return (
            status === hc.SdkAvailabilityStatus.SDK_AVAILABLE &&
            (await hc.initialize())
        )
    })().catch(() => false)
    if (await initialized) return hc
    initialized = null // Installed later (say, from the Play Store): try again next time.
    return null
}

/**
 * Whether the integration can be offered. True wherever the module loads:
 * phones without Health Connect installed find out when they connect, and are
 * sent to the Play Store for it.
 */
export function isAppleHealthSupported(): boolean {
    return getHealthConnect() !== null
}

/**
 * Show Health Connect's permission screen for every type we read, plus
 * reading in the background. Unlike iOS, Android says what was granted, so a
 * "no" to everything fails here rather than syncing nothing.
 */
export async function requestAppleHealthAccess(): Promise<void> {
    const hc = await ready()
    if (!hc) {
        if (getHealthConnect())
            void Linking.openURL(PLAY_STORE_URL).catch(() => {})
        throw new Error(
            "Beacc reads your activity through Health Connect. Install it from the Play Store, then connect again."
        )
    }
    const granted = await hc.requestPermission([
        ...READ_TYPES.map((recordType) => ({
            accessType: "read" as const,
            recordType
        })),
        { accessType: "read", recordType: "BackgroundAccessPermission" }
    ])
    const readable = granted.filter(
        (p) =>
            p.accessType === "read" &&
            (READ_TYPES as readonly string[]).includes(p.recordType)
    )
    if (readable.length === 0)
        throw new Error(
            "Beacc needs access to at least one kind of data in Health Connect."
        )
}

/** Whether any of the types we read has been granted. */
export async function hasRequestedAppleHealthAccess(): Promise<boolean> {
    const hc = await ready()
    if (!hc) return false
    try {
        const granted = await hc.getGrantedPermissions()
        return granted.some(
            (p) =>
                p.accessType === "read" &&
                (READ_TYPES as readonly string[]).includes(p.recordType)
        )
    } catch {
        return false
    }
}

// Health Connect has no change notifications. These match the iOS module's
// API; the periodic background task and foreground syncs do the work instead.

export async function enableBackgroundSync(): Promise<void> {}

export async function disableBackgroundSync(): Promise<void> {}

export type HealthChange = "data" | "steps"

export function listenForHealthChanges(): void {}

export function onHealthChange(
    _onChange: (change: HealthChange) => void
): () => void {
    return () => {}
}

/** A range from [since] to now, as Health Connect takes it. */
function sinceNow(since: number) {
    return {
        operator: "between" as const,
        startTime: new Date(since).toISOString(),
        endTime: new Date().toISOString()
    }
}

/** Every record of [type] from [since] on, following Health Connect's pages. */
async function readAll<T extends (typeof READ_TYPES)[number]>(
    hc: HealthConnect,
    type: T,
    since: number
) {
    const records = []
    let pageToken: string | undefined
    do {
        const page = await hc.readRecords(type, {
            timeRangeFilter: sinceNow(since),
            ascendingOrder: true,
            pageSize: 1000,
            pageToken
        })
        records.push(...page.records)
        pageToken = page.pageToken || undefined
    } while (pageToken)
    return records
}

/** Health Connect exercise → the backend's coarse workout types. */
function workoutType(hc: HealthConnect, exercise: number): WorkoutType {
    const t = hc.ExerciseType
    switch (exercise) {
        case t.RUNNING:
        case t.RUNNING_TREADMILL:
            return "RUN"
        case t.WALKING:
        case t.WHEELCHAIR:
            return "WALK"
        case t.HIKING:
        case t.SNOWSHOEING:
            return "HIKE"
        case t.BIKING:
        case t.BIKING_STATIONARY:
            return "CYCLING"
        case t.SWIMMING_POOL:
        case t.SWIMMING_OPEN_WATER:
        case t.WATER_POLO:
            return "SWIM"
        case t.STRENGTH_TRAINING:
        case t.WEIGHTLIFTING:
        case t.BENCH_PRESS:
        case t.DEADLIFT:
        case t.SQUAT:
        case t.LUNGE:
        case t.LAT_PULL_DOWN:
        case t.BARBELL_SHOULDER_PRESS:
        case t.DUMBBELL_CURL_LEFT_ARM:
        case t.DUMBBELL_CURL_RIGHT_ARM:
        case t.DUMBBELL_FRONT_RAISE:
        case t.DUMBBELL_LATERAL_RAISE:
        case t.DUMBBELL_TRICEPS_EXTENSION_LEFT_ARM:
        case t.DUMBBELL_TRICEPS_EXTENSION_RIGHT_ARM:
        case t.DUMBBELL_TRICEPS_EXTENSION_TWO_ARM:
            return "WEIGHTLIFTING"
        case t.CRUNCH:
        case t.PLANK:
        case t.BENCH_SIT_UP:
        case t.BACK_EXTENSION:
        case t.UPPER_TWIST:
        case t.FORWARD_TWIST:
            return "CORE"
        case t.HIGH_INTENSITY_INTERVAL_TRAINING:
        case t.BOOT_CAMP:
        case t.BURPEE:
        case t.JUMPING_JACK:
        case t.JUMP_ROPE:
        case t.CALISTHENICS:
        case t.EXERCISE_CLASS:
            return "HIIT"
        case t.YOGA:
            return "YOGA"
        case t.PILATES:
            return "PILATES"
        case t.ROWING:
        case t.ROWING_MACHINE:
            return "ROWING"
        case t.ELLIPTICAL:
            return "ELLIPTICAL"
        case t.STAIR_CLIMBING:
        case t.STAIR_CLIMBING_MACHINE:
            return "STAIRS"
        case t.DANCING:
            return "DANCE"
        case t.BOXING:
        case t.MARTIAL_ARTS:
            return "BOXING"
        case t.ROCK_CLIMBING:
            return "CLIMBING"
        case t.TENNIS:
            return "TENNIS"
        case t.SOCCER:
            return "SOCCER"
        case t.BASKETBALL:
            return "BASKETBALL"
        case t.VOLLEYBALL:
            return "VOLLEYBALL"
        case t.GOLF:
            return "GOLF"
        case t.SKIING:
        case t.SNOWBOARDING:
            return "SNOW_SPORTS"
        default:
            return "OTHER"
    }
}

/** Active calories burned between [start] and [end], or 0 if none were recorded or can't be read. */
async function activeCalories(
    hc: HealthConnect,
    start: string,
    end: string
): Promise<number> {
    try {
        const total = await hc.aggregateRecord({
            recordType: "ActiveCaloriesBurned",
            timeRangeFilter: {
                operator: "between",
                startTime: start,
                endTime: end
            }
        })
        return total.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0
    } catch {
        return 0
    }
}

export async function syncAppleHealthWorkouts(
    api: ApiConfig,
    since: number
): Promise<number> {
    const hc = await ready()
    if (!hc) return 0

    const sessions = await readAll(hc, "ExerciseSession", since)
    const workouts: ImportedWorkout[] = []
    for (const s of sessions) {
        const id = s.metadata?.id
        if (!id) continue
        const start = new Date(s.startTime).getTime()
        const end = new Date(s.endTime).getTime()
        workouts.push({
            externalID: id,
            type: workoutType(hc, s.exerciseType),
            durationMin: Math.round((end - start) / 60_000),
            calories: Math.round(
                await activeCalories(hc, s.startTime, s.endTime)
            ),
            happenedAt: start
        })
    }
    return importInPages(workouts, IMPORT_PAGE, (page) =>
        importWorkouts(api, page)
    )
}

/**
 * Import per-day sleep totals for every day from [since] (ms epoch) on.
 * Resolves to how many days were written. Counts the stages spent asleep; a
 * session with no stages (most phones without a watch) counts whole, the way
 * time in bed does on iOS.
 */
export async function syncAppleHealthSleep(
    api: ApiConfig,
    since: number
): Promise<number> {
    const hc = await ready()
    if (!hc) return 0

    const stage = hc.SleepStageType
    const sleeping = new Set<number>([
        stage.SLEEPING,
        stage.LIGHT,
        stage.DEEP,
        stage.REM,
        stage.UNKNOWN
    ])
    const asleep: Span[] = []
    const inBed: Span[] = []
    // Start a day early so a night already under way at [since] is read whole.
    for (const s of await readAll(hc, "SleepSession", since - DAY_MS)) {
        inBed.push([
            new Date(s.startTime).getTime(),
            new Date(s.endTime).getTime()
        ])
        for (const st of s.stages ?? [])
            if (sleeping.has(st.stage))
                asleep.push([
                    new Date(st.startTime).getTime(),
                    new Date(st.endTime).getTime()
                ])
    }
    return importInPages(
        sleepDays(asleep, inBed, since),
        DAY_IMPORT_PAGE,
        (page) => importSleep(api, page)
    )
}

/**
 * Per-day totals of [recordType] from [since]'s local midnight to now. Health
 * Connect's aggregate dedupes what a watch and phone both counted, like
 * HealthKit's cumulative sum.
 */
async function dailyTotals<T extends "Steps" | "Distance">(
    hc: HealthConnect,
    recordType: T,
    since: number
) {
    const firstDay = localDayStart(since)
    const groups = await hc.aggregateGroupByPeriod({
        recordType,
        timeRangeFilter: sinceNow(firstDay),
        timeRangeSlicer: { period: "DAYS", length: 1 }
    })
    return groups
        .map((g) => ({
            // Local noon, so a few hours' gap to the account's zone keeps the date.
            day: localDayStart(new Date(g.startTime).getTime()) + DAY_MS / 2,
            result: g.result
        }))
        .filter((g) => g.day >= firstDay)
}

export async function syncAppleHealthSteps(
    api: ApiConfig,
    since: number
): Promise<number> {
    const hc = await ready()
    if (!hc) return 0
    const days: ImportedStepsDay[] = (
        await dailyTotals(hc, "Steps", since)
    ).map(({ day, result }) => ({
        day,
        steps: Math.min(
            MAX_STEPS_PER_DAY,
            Math.round("COUNT_TOTAL" in result ? result.COUNT_TOTAL : 0)
        )
    }))
    return importInPages(days, DAY_IMPORT_PAGE, (page) =>
        importSteps(api, page)
    )
}

/**
 * Import per-day distance, in metres. Health Connect has one distance type for
 * every activity, so unlike iOS (walking and running only) this includes
 * cycling and the like.
 */
export async function syncAppleHealthDistance(
    api: ApiConfig,
    since: number
): Promise<number> {
    const hc = await ready()
    if (!hc) return 0
    const days: ImportedDistanceDay[] = (
        await dailyTotals(hc, "Distance", since)
    ).map(({ day, result }) => ({
        day,
        meters: Math.min(
            MAX_METERS_PER_DAY,
            Math.round("DISTANCE" in result ? result.DISTANCE.inMeters : 0)
        )
    }))
    return importInPages(days, DAY_IMPORT_PAGE, (page) =>
        importDistance(api, page)
    )
}
