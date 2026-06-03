import type { GoalPeriod } from "../goals/requests"
import { request, type ApiConfig } from "../http"

/** Summary returned by list/create/join. */
export interface CompetitionSummary {
    id: string
    name: string
    ownerID: string
    joinCode: string
    createdAt: number
}

export interface CompetitionMember {
    userID: string
    username: string
    joinedAt: number
    /** Member's current streak inside this competition. */
    streak: number
}

export interface CompetitionGoal {
    integration: string
    metric: string
    period: GoalPeriod
    target: number
    createdAt: number
}

export interface CompetitionDetail {
    id: string
    name: string
    ownerID: string
    joinCode: string
    createdAt: number
    members: CompetitionMember[]
    goals: CompetitionGoal[]
}

export interface CreateCompetitionRequest {
    name: string
}

export interface CreateCompetitionGoalRequest {
    integration: string
    metric: string
    period: GoalPeriod
    target: number
}

/** GET /api/competitions — list competitions the caller is a member of. */
export function listCompetitions(config: ApiConfig): Promise<CompetitionSummary[]> {
    return request(config, "GET", "/competitions", undefined, { auth: true })
}

/** POST /api/competitions — create a competition, caller becomes owner. */
export function createCompetition(
    config: ApiConfig,
    body: CreateCompetitionRequest
): Promise<CompetitionSummary> {
    return request(config, "POST", "/competitions", body, { auth: true })
}

/** GET /api/competitions/{id} — detail with members + shared goals. */
export function getCompetition(
    config: ApiConfig,
    id: string
): Promise<CompetitionDetail> {
    return request(config, "GET", `/competitions/${id}`, undefined, { auth: true })
}

/** DELETE /api/competitions/{id} — owner deletes the competition. */
export function deleteCompetition(config: ApiConfig, id: string): Promise<void> {
    return request(config, "DELETE", `/competitions/${id}`, undefined, {
        auth: true,
        expectJson: false
    })
}

/** POST /api/competitions/join — join via a join code. */
export function joinCompetition(
    config: ApiConfig,
    joinCode: string
): Promise<CompetitionSummary> {
    return request(
        config,
        "POST",
        "/competitions/join",
        { joinCode },
        { auth: true }
    )
}

/** POST /api/competitions/{id}/leave — leave a competition (non-owner). */
export function leaveCompetition(config: ApiConfig, id: string): Promise<void> {
    return request(config, "POST", `/competitions/${id}/leave`, undefined, {
        auth: true,
        expectJson: false
    })
}

/** POST /api/competitions/{id}/goals — owner adds or updates a shared goal. */
export function addCompetitionGoal(
    config: ApiConfig,
    id: string,
    body: CreateCompetitionGoalRequest
): Promise<CompetitionGoal> {
    return request(config, "POST", `/competitions/${id}/goals`, body, {
        auth: true
    })
}

/** DELETE /api/competitions/{id}/goals/{integration}/{metric}/{period} — owner removes a goal. */
export function removeCompetitionGoal(
    config: ApiConfig,
    id: string,
    integration: string,
    metric: string,
    period: GoalPeriod
): Promise<void> {
    return request(
        config,
        "DELETE",
        `/competitions/${id}/goals/${encodeURIComponent(integration)}/${encodeURIComponent(metric)}/${period}`,
        undefined,
        { auth: true, expectJson: false }
    )
}
