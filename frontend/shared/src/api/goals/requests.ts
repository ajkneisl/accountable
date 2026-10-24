import type { HabitColor } from "../habits/requests"
import { request, type ApiConfig } from "../http"

export type GoalPeriod = "DAILY" | "WEEKLY"

/** Goals share the habit palette. */
export type GoalColor = HabitColor

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
    /** Card accent; null (or absent) means the integration's default. */
    color?: GoalColor | null
    /** The competition this goal belongs to; null (or absent) for a personal goal. */
    competition?: GoalCompetition | null
}

/** The competition a {@link Goal} comes from. */
export interface GoalCompetition {
    id: string
    name: string
}

export interface CreateGoalRequest {
    integration: string
    metric: string
    period: GoalPeriod
    target: number
}

/** Fields to change on a goal; omitted ones are left as they are. */
export interface UpdateGoalRequest {
    target?: number
    color?: GoalColor
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
 * `offset` weeks before the current week (0 = this week, 1 = last week, …). Pass
 * `competitionID` for a competition goal rather than one of the caller's own.
 */
export function getGoalWeek(
    config: ApiConfig,
    integration: string,
    metric: string,
    period: GoalPeriod,
    offset = 0,
    competitionID?: string
): Promise<GoalWeek> {
    const competition = competitionID
        ? `&competition=${encodeURIComponent(competitionID)}`
        : ""
    return request(
        config,
        "GET",
        `/goals/${encodeURIComponent(integration)}/${encodeURIComponent(metric)}/${period}/week?offset=${offset}${competition}`,
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

/** PATCH /api/goals/{integration}/{metric}/{period} — change a goal's target and/or color. */
export function updateGoal(
    config: ApiConfig,
    integration: string,
    metric: string,
    period: GoalPeriod,
    body: UpdateGoalRequest
): Promise<Goal> {
    return request(
        config,
        "PATCH",
        `/goals/${encodeURIComponent(integration)}/${encodeURIComponent(metric)}/${period}`,
        body,
        { auth: true }
    )
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
