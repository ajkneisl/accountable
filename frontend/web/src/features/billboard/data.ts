// Read-only loaders for the billboard. Nothing here writes to the backend.

import {
    type ApiConfig,
    type CompetitionDetail,
    type CompetitionWeek,
    getCompetition,
    getCompetitionWeek,
    listCompetitions
} from "@shared/index"

/** A competition's members and shared goals, with the current week's progress. */
export interface CompetitionView {
    detail: CompetitionDetail
    week: CompetitionWeek
}

export async function loadCompetition(
    api: ApiConfig,
    id: string
): Promise<CompetitionView> {
    const [detail, week] = await Promise.all([
        getCompetition(api, id),
        getCompetitionWeek(api, id, 0)
    ])
    return { detail, week }
}

/** Every competition the user is in, each with its current week. */
export async function loadCompetitions(
    api: ApiConfig
): Promise<CompetitionView[]> {
    const list = await listCompetitions(api)
    return Promise.all(list.map((c) => loadCompetition(api, c.id)))
}
