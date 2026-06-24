import type { CompetitionDetail, CompetitionSummary } from "../competition/requests"
import type { Goal } from "../goals/requests"
import { request, type ApiConfig } from "../http"
import type { IntegrationStatus, Workout } from "../integrations/requests"
import type { DayStatus } from "../streak/requests"

/**
 * Everything the dashboard renders, in one payload — returned by {@link getDashboard} so the client
 * loads with a single request instead of fanning out to goals, streak, competitions, etc.
 */
export interface DashboardResponse {
    goals: Goal[]
    streak: number
    history: DayStatus[]
    competitions: CompetitionSummary[]
    topCompetition: CompetitionDetail | null
    workouts: Workout[]
    integrations: IntegrationStatus[]
}

/** GET /api/dashboard — every dashboard view aggregated into one response. */
export function getDashboard(config: ApiConfig): Promise<DashboardResponse> {
    return request(config, "GET", "/dashboard", undefined, { auth: true })
}
