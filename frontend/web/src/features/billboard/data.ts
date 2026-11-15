// Read-only loaders for the billboard. Nothing here writes to the backend.

import {
    type ApiConfig,
    type CompetitionDetail,
    type CompetitionLeaderboard,
    type CompetitionWeek,
    type Goal,
    getCompetition,
    getCompetitionLeaderboard,
    getDashboard,
    getCompetitionWeek,
    listCompetitions
} from "@shared/index"

/** The user's own goals followed by their competitions' goals, as in the app. */
export async function loadGoals(api: ApiConfig): Promise<Goal[]> {
    const { goals, competitionGoals } = await getDashboard(api)
    return [...goals, ...competitionGoals]
}

/**
 * A competition's members and shared goals, with the current week's progress
 * and the all-time leaderboard — which is null if it couldn't be loaded, so
 * the rest still shows.
 */
export interface CompetitionView {
    detail: CompetitionDetail
    week: CompetitionWeek
    leaderboard: CompetitionLeaderboard | null
}

export async function loadCompetition(
    api: ApiConfig,
    id: string
): Promise<CompetitionView> {
    const [detail, week, leaderboard] = await Promise.all([
        getCompetition(api, id),
        getCompetitionWeek(api, id, 0),
        getCompetitionLeaderboard(api, id).catch(() => null)
    ])
    return { detail, week, leaderboard }
}

/** Every competition the user is in, each with its current week. */
export async function loadCompetitions(
    api: ApiConfig
): Promise<CompetitionView[]> {
    const list = await listCompetitions(api)
    return Promise.all(list.map((c) => loadCompetition(api, c.id)))
}
