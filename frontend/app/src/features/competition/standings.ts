// Competition scoring: who's on pace for each shared goal this week, and the
// resulting leaderboard. Shared by the competition board and the home screen
// widget, so it stays free of UI imports.
//
// A weekly goal is judged on the week's total. A daily goal has to be met on
// every day: a big day can't cover for a missed one. Days before a member was
// in the competition don't count. The backend's competition/Scoring.kt applies
// the same rules to the leaderboard and notifications.

import type {
    CompetitionDetail,
    CompetitionGoalBoard,
    CompetitionMemberWeek,
    CompetitionWeek
} from "@shared/index"
import { isLimit, localWeekday, meetsTarget, paceBar } from "../dashboard/types"
import { FALLBACK_BAR_COLOR } from "./colors"

/**
 * The total a weekly goal's member must have reached *by [now]* to be "on pace":
 * - past weeks compare against the full target
 * - the current week spreads it over the days already over ([paceBar])
 *
 * For a limit ({@link isLimit}) it's the most a member can have used instead:
 * the limit's share for the days through today.
 */
export function paceTarget(
    board: CompetitionGoalBoard,
    currentWeek: boolean,
    now = Date.now()
): number {
    if (!currentWeek) return board.target
    if (isLimit(board.integration, board.metric))
        return (board.target * (localWeekday(now) + 1)) / 7
    return paceBar(board.target, now)
}

/**
 * Where one day of a daily goal stands for a member:
 * - excluded: before they were in the competition, so it doesn't count
 * - hit / missed: settled. That's a day that's over, or today once it's
 *   decided: the target reached, or a limit broken
 * - pending: today, still open
 * - future: still to come
 */
export type DayState = "excluded" | "hit" | "missed" | "pending" | "future"

/** [member]'s seven {@link DayState}s for a daily [board], Monday first. */
export function dayStates(
    board: CompetitionGoalBoard,
    member: CompetitionMemberWeek,
    currentWeek: boolean,
    now = Date.now()
): DayState[] {
    const today = currentWeek ? localWeekday(now) : 7
    const first = member.firstDay ?? 0
    const limit = isLimit(board.integration, board.metric)
    return Array.from({ length: 7 }, (_, i): DayState => {
        if (i < first) return "excluded"
        if (i > today) return "future"
        const met = meetsTarget(board, member.vals[i] ?? 0, board.target)
        if (i < today) return met ? "hit" : "missed"
        // Today: reaching a target settles it, but a limit only once it's broken.
        if (limit) return met ? "pending" : "missed"
        return met ? "hit" : "pending"
    })
}

/**
 * Whether [member] is on pace for [board] this week, or for a past week met it:
 * a daily goal not missed on any day so far, a weekly total at its pace.
 */
export function memberOnPace(
    board: CompetitionGoalBoard,
    member: CompetitionMemberWeek | undefined,
    currentWeek: boolean,
    now = Date.now()
): boolean {
    if (board.period === "DAILY") {
        // Missing from the board: a week of nothing.
        const m = member ?? { userID: "", username: "", vals: [], total: 0 }
        return !dayStates(board, m, currentWeek, now).includes("missed")
    }
    return meetsTarget(
        board,
        member?.total ?? 0,
        paceTarget(board, currentWeek, now)
    )
}

export type MemberStanding = {
    userID: string
    username: string
    avatarVersion?: number | null
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
            const hits = week.goals.map((board) =>
                memberOnPace(
                    board,
                    board.members.find((x) => x.userID === m.userID),
                    currentWeek,
                    now
                )
            )
            return {
                userID: m.userID,
                username: m.username,
                avatarVersion: m.avatarVersion,
                streak: m.streak,
                color: colorMap[m.userID] ?? FALLBACK_BAR_COLOR,
                goalsHit: hits.filter(Boolean).length,
                hits
            }
        })
        .sort((a, b) => b.goalsHit - a.goalsHit || b.streak - a.streak)
}
