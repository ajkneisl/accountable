// Competition scoring and per-member colors, mirroring the app's
// competition/standings.ts and competition/colors.ts: a weekly goal is judged
// on the week's total, and a daily goal has to be met on every day.

import type {
    CompetitionDetail,
    CompetitionGoalBoard,
    CompetitionMember,
    CompetitionMemberWeek,
    CompetitionWeek
} from "@shared/index"
import { HABIT_PALETTE } from "./grid"
import { isLimit, localWeekday, meetsTarget, paceBar } from "./format"

export const FALLBACK_BAR_COLOR = "var(--ink-3)"

/** Text that reads on top of a member's fill, e.g. their rank number. */
export function onMemberFill(fill: string): string {
    const entry = Object.values(HABIT_PALETTE).find((p) => p.fill === fill)
    return entry?.on ?? "var(--bg)"
}

/**
 * Member id → the color they picked in the app (or the server's default for
 * them), so each person reads as the same color everywhere.
 */
export function buildColorMap(
    members: Pick<CompetitionMember, "userID" | "color">[]
): Record<string, string> {
    const map: Record<string, string> = {}
    for (const m of members)
        map[m.userID] = HABIT_PALETTE[m.color]?.fill ?? FALLBACK_BAR_COLOR
    return map
}

/**
 * The total a weekly goal's member must have reached by now to be on pace this
 * week — or for a limit ({@link isLimit}), the most they can have used: its
 * share through today.
 */
export function paceTarget(board: CompetitionGoalBoard, now = Date.now()) {
    if (isLimit(board.integration, board.metric))
        return (board.target * (localWeekday(now) + 1)) / 7
    return paceBar(board.target, now)
}

/**
 * Where one day of a daily goal stands for a member this week: before they
 * joined (excluded), settled (hit or missed — today once the target is reached
 * or a limit broken), today still open (pending), or still to come (future).
 */
export type DayState = "excluded" | "hit" | "missed" | "pending" | "future"

/** [member]'s seven {@link DayState}s for a daily [board] this week, Monday first. */
export function dayStates(
    board: CompetitionGoalBoard,
    member: CompetitionMemberWeek,
    now = Date.now()
): DayState[] {
    const today = localWeekday(now)
    const first = member.firstDay ?? 0
    const limit = isLimit(board.integration, board.metric)
    return Array.from({ length: 7 }, (_, i): DayState => {
        if (i < first) return "excluded"
        if (i > today) return "future"
        const met = meetsTarget(board, member.vals[i] ?? 0, board.target)
        if (i < today) return met ? "hit" : "missed"
        if (limit) return met ? "pending" : "missed"
        return met ? "hit" : "pending"
    })
}

/** Whether [member] is on pace for [board] this week. */
export function memberOnPace(
    board: CompetitionGoalBoard,
    member: CompetitionMemberWeek | undefined,
    now = Date.now()
): boolean {
    if (board.period === "DAILY") {
        const m = member ?? { userID: "", username: "", vals: [], total: 0 }
        return !dayStates(board, m, now).includes("missed")
    }
    return meetsTarget(board, member?.total ?? 0, paceTarget(board, now))
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

/** Rank members by goals-on-pace this week, then by streak — leader first. */
export function computeStandings(
    competition: CompetitionDetail,
    week: CompetitionWeek,
    colorMap: Record<string, string>,
    now = Date.now()
): MemberStanding[] {
    return competition.members
        .map((m) => {
            const hits = week.goals.map((board) =>
                memberOnPace(
                    board,
                    board.members.find((x) => x.userID === m.userID),
                    now
                )
            )
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
