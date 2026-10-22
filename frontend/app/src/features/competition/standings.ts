// Competition scoring: who's on pace for each shared goal this week, and the
// resulting leaderboard. Shared by the competition board and the home screen
// widget, so it stays free of UI imports.

import type {
    CompetitionDetail,
    CompetitionGoalBoard,
    CompetitionWeek
} from "@shared/index"
import { dayOfIsoWeek } from "../dashboard/types"
import { FALLBACK_BAR_COLOR } from "./colors"

/** Weekly-equivalent target the weekly total is measured against. */
export function weeklyTarget(board: CompetitionGoalBoard): number {
    return board.period === "WEEKLY" ? board.target : board.target * 7
}

/**
 * The total a member must have reached *by [now]* to be "on pace":
 * - past weeks compare against the full weekly target
 * - the current week prorates it by how far into the week we are
 */
export function paceTarget(
    board: CompetitionGoalBoard,
    currentWeek: boolean,
    now = Date.now()
): number {
    const wt = weeklyTarget(board)
    return currentWeek ? (wt * dayOfIsoWeek(now)) / 7 : wt
}

export type MemberStanding = {
    userID: string
    username: string
    streak: number
    color: string
    goalsHit: number
    /** Per-goal on-pace flags, in board order, for the segmented indicator. */
    hits: boolean[]
}

/** Rank members by goals-on-pace, then by streak — leader first. */
export function computeStandings(
    competition: CompetitionDetail,
    week: CompetitionWeek,
    currentWeek: boolean,
    colorMap: Record<string, string>,
    now = Date.now()
): MemberStanding[] {
    return competition.members
        .map((m) => {
            const hits = week.goals.map((board) => {
                const mw = board.members.find((x) => x.userID === m.userID)
                return (mw?.total ?? 0) >= paceTarget(board, currentWeek, now)
            })
            return {
                userID: m.userID,
                username: m.username,
                streak: m.streak,
                color: colorMap[m.userID] ?? FALLBACK_BAR_COLOR,
                goalsHit: hits.filter(Boolean).length,
                hits
            }
        })
        .sort((a, b) => b.goalsHit - a.goalsHit || b.streak - a.streak)
}
