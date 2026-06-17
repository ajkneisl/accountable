import { request, type ApiConfig } from "../http"

/**
 * Configuration status of a single integration for the authenticated user.
 */
export interface IntegrationStatus {
    name: string
    enabled: boolean
    externalID: string | null
    /** Ms epoch of the last upstream refresh; null when not enabled or never fetched. */
    lastFetched: number | null
}

/**
 * A day's integration data plus, for today, when it was last refreshed upstream.
 * `data` is the provider-specific payload and is left untyped here.
 */
export interface IntegrationDayResponse {
    data: unknown
    lastFetched: number | null
}

/**
 * One day of stored integration data. Discriminated by `type`, matching the backend's
 * polymorphic `IntegrationData` serialization. `date` is the UTC-day start in ms epoch.
 */
export type IntegrationHistoryDay =
    | { type: "github"; date: number; commits: number }
    | {
          type: "leetcode"
          date: number
          easy: number
          medium: number
          hard: number
      }
    | {
          type: "apple_fitness"
          date: number
          calories: number
          workouts: number
      }

/**
 * GET /api/integrations/{name}/history?days={n} — stored per-day data for the last {days}
 * calendar days (default 14), most-recent day first. Read-only; never triggers an upstream refresh.
 */
export function getIntegrationHistory(
    config: ApiConfig,
    name: string,
    days = 14
): Promise<IntegrationHistoryDay[]> {
    return request(
        config,
        "GET",
        `/integrations/${encodeURIComponent(name)}/history?days=${days}`,
        undefined,
        { auth: true }
    )
}

/** GET /api/integrations — list every supported integration with the user's connection state. */
export function listIntegrations(
    config: ApiConfig
): Promise<IntegrationStatus[]> {
    return request(config, "GET", "/integrations", undefined, { auth: true })
}

/**
 * GET /api/integrations/{name}?date={ms} — fetch a day's data. When {date} is today
 * (the default) and the stored row is missing or stale, the backend refreshes it from
 * upstream before responding.
 */
export function getIntegration(
    config: ApiConfig,
    name: string,
    date: number = Date.now()
): Promise<IntegrationDayResponse> {
    return request(
        config,
        "GET",
        `/integrations/${encodeURIComponent(name)}?date=${date}`,
        undefined,
        { auth: true }
    )
}

/** POST /api/integrations/{name} — link {name} to an upstream account. */
export function enableIntegration(
    config: ApiConfig,
    name: string,
    externalID: string
): Promise<void> {
    return request(
        config,
        "POST",
        `/integrations/${encodeURIComponent(name)}`,
        { externalID },
        { auth: true, expectJson: false }
    )
}

/** DELETE /api/integrations/{name} — disconnect {name}. */
export function disableIntegration(
    config: ApiConfig,
    name: string
): Promise<void> {
    return request(
        config,
        "DELETE",
        `/integrations/${encodeURIComponent(name)}`,
        undefined,
        { auth: true, expectJson: false }
    )
}

/** Recognized Apple Workout types. Matches the backend enum. */
export type WorkoutType =
    | "RUN"
    | "WEIGHTLIFTING"
    | "BASKETBALL"
    | "PICKLEBALL"
    | "OTHER"

/** Where a workout row came from. `APPLE` is reserved for a future iOS companion app. */
export type WorkoutSource = "MANUAL" | "APPLE"

/** A single Apple Fitness workout as stored on the backend. */
export interface Workout {
    id: string
    type: WorkoutType
    durationMin: number
    calories: number
    happenedAt: number
    source: WorkoutSource
}

export interface LogWorkoutRequest {
    type: WorkoutType
    durationMin: number
    calories: number
    /** Ms epoch when the workout occurred. Defaults to now if omitted. */
    happenedAt?: number
}

/** GET /api/integrations/apple_fitness/workouts?date={ms} — workouts for that calendar day. */
export function listWorkouts(
    config: ApiConfig,
    date: number = Date.now()
): Promise<Workout[]> {
    return request(
        config,
        "GET",
        `/integrations/apple_fitness/workouts?date=${date}`,
        undefined,
        { auth: true }
    )
}

/** POST /api/integrations/apple_fitness/workouts — manually log a workout. */
export function logWorkout(
    config: ApiConfig,
    body: LogWorkoutRequest
): Promise<Workout> {
    return request(
        config,
        "POST",
        "/integrations/apple_fitness/workouts",
        body,
        { auth: true }
    )
}

/** DELETE /api/integrations/apple_fitness/workouts/{id} — remove a workout. */
export function deleteWorkout(config: ApiConfig, id: string): Promise<void> {
    return request(
        config,
        "DELETE",
        `/integrations/apple_fitness/workouts/${encodeURIComponent(id)}`,
        undefined,
        { auth: true, expectJson: false }
    )
}
