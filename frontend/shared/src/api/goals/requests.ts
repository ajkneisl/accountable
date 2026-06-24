import { request, type ApiConfig } from "../http"

export type GoalPeriod = "DAILY" | "WEEKLY"

/**
 * A goal returned by the backend, with current-period progress and a 7-day value strip.
 */
export interface Goal {
    integration: string
    metric: string
    period: GoalPeriod
    target: number
    progress: number
    /** Per-day raw metric values for the last 7 UTC days, oldest first. */
    vals: number[]
    createdAt: number
    /** Monday 00:00 (ms epoch) of the current week, in the user's timezone. */
    weekStart: number
    /** Current Monday-anchored week's per-day values, Monday first — lets the card skip a fetch. */
    weekVals: number[]
    /** Sum of {@link weekVals}. */
    weekTotal: number
}

export interface CreateGoalRequest {
    integration: string
    metric: string
    period: GoalPeriod
    target: number
}

/** One Monday-anchored week of a goal's metric, returned by {@link getGoalWeek}. */
export interface GoalWeek {
    /** Monday 00:00 (ms epoch) of the week, in the user's timezone. */
    weekStart: number
    /** The following Monday 00:00 (ms epoch), exclusive. */
    weekEnd: number
    /** Per-day metric values for the seven days of the week, Monday first. */
    vals: number[]
    /** Sum of {@link vals} — the goal's progress for that week. */
    total: number
    target: number
    period: GoalPeriod
}

/** GET /api/goals — list the authenticated user's goals. */
export function listGoals(config: ApiConfig): Promise<Goal[]> {
    return request(config, "GET", "/goals", undefined, { auth: true })
}

/**
 * GET /api/goals/{integration}/{metric}/{period}/week?offset=N — a goal's Monday-anchored week,
 * `offset` weeks before the current week (0 = this week, 1 = last week, …).
 */
export function getGoalWeek(
    config: ApiConfig,
    integration: string,
    metric: string,
    period: GoalPeriod,
    offset = 0
): Promise<GoalWeek> {
    return request(
        config,
        "GET",
        `/goals/${encodeURIComponent(integration)}/${encodeURIComponent(metric)}/${period}/week?offset=${offset}`,
        undefined,
        { auth: true }
    )
}

/** POST /api/goals — create or replace a goal. */
export function createGoal(
    config: ApiConfig,
    body: CreateGoalRequest
): Promise<Goal> {
    return request(config, "POST", "/goals", body, { auth: true })
}

/** DELETE /api/goals/{integration}/{metric}/{period} — remove a goal. */
export function deleteGoal(
    config: ApiConfig,
    integration: string,
    metric: string,
    period: GoalPeriod
): Promise<void> {
    return request(
        config,
        "DELETE",
        `/goals/${encodeURIComponent(integration)}/${encodeURIComponent(metric)}/${period}`,
        undefined,
        { auth: true, expectJson: false }
    )
}
