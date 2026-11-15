// Where the user stands in each of their competitions this week, for the
// Competitions tab's rows. The list endpoint only has names, so this loads each
// competition's members and current week and ranks them the way its Weekly page
// does.

import { useEffect, useState } from "react"
import {
    type CompetitionSummary,
    getCompetition,
    getCompetitionWeek,
    useApi
} from "@shared/index"
import { computeStandings } from "./standings"

/** Competitions ranked per load; each costs two requests. */
const MAX_COMPETITIONS = 10

export type CompetitionRank = {
    /** The user's place this week, 1 = first; null while no shared goal ranks anyone. */
    rank: number | null
    members: number
}

/** Each competition's {@link CompetitionRank} by id, filled in as they load. */
export function useCompetitionRanks(
    competitions: CompetitionSummary[],
    meID: string | undefined
): Record<string, CompetitionRank> {
    const api = useApi()
    const [ranks, setRanks] = useState<Record<string, CompetitionRank>>({})

    useEffect(() => {
        let cancelled = false
        for (const { id } of competitions.slice(0, MAX_COMPETITIONS)) {
            Promise.all([getCompetition(api, id), getCompetitionWeek(api, id)])
                .then(([detail, week]) => {
                    if (cancelled) return
                    const place =
                        week.goals.length > 0
                            ? computeStandings(
                                  detail,
                                  week,
                                  true,
                                  {}
                              ).findIndex((s) => s.userID === meID)
                            : -1
                    setRanks((known) => ({
                        ...known,
                        [id]: {
                            rank: place >= 0 ? place + 1 : null,
                            members: detail.members.length
                        }
                    }))
                })
                .catch(() => {
                    // The row just goes without its standing.
                })
        }
        return () => {
            cancelled = true
        }
    }, [api, competitions, meID])

    return ranks
}
