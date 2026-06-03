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
}

export interface CreateGoalRequest {
    integration: string
    metric: string
    period: GoalPeriod
    target: number
}

/** GET /api/goals — list the authenticated user's goals. */
export function listGoals(config: ApiConfig): Promise<Goal[]> {
    return request(config, "GET", "/goals", undefined, { auth: true })
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
