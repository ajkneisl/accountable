// Competition scoring and per-member colors, mirroring the app's
// competition/standings.ts and competition/colors.ts.

import type {
    CompetitionDetail,
    CompetitionGoalBoard,
    CompetitionMember,
    CompetitionMemberWeek,
    CompetitionWeek
} from "@shared/index"
import { HABIT_PALETTE } from "./grid"
import {
    isLimit,
    localWeekday,
    meetsTarget,
    paceBar,
    weeklyTarget
} from "./format"

export const FALLBACK_BAR_COLOR = "var(--ink-3)"

/** Text that reads on top of a member's fill, e.g. their rank number. */
export function onMemberFill(fill: string): string {
    const entry = Object.values(HABIT_PALETTE).find((p) => p.fill === fill)
    return entry?.dark ? "var(--bg)" : "var(--ink)"
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
 * The amount a member's row shows against [board.target]: a weekly goal's
 * running total, or today's value for a daily goal, so it reads per day rather
 * than as a ×7 sum.
 */
export function displayValue(
    board: CompetitionGoalBoard,
    member: CompetitionMemberWeek,
    now = Date.now()
): number {
    if (board.period !== "DAILY") return member.total
    return member.vals[localWeekday(now)] ?? 0
}

/**
 * The total a member must have reached by now to be on pace this week — or for
 * a limit ({@link isLimit}), the most they can have used: its share through today.
 */
export function paceTarget(board: CompetitionGoalBoard, now = Date.now()) {
    const wt = weeklyTarget(board)
    if (isLimit(board.integration, board.metric))
        return (wt * (localWeekday(now) + 1)) / 7
    return paceBar(wt, now)
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
            const hits = week.goals.map((board) => {
                const mw = board.members.find((x) => x.userID === m.userID)
                return meetsTarget(
                    board,
                    mw?.total ?? 0,
                    paceTarget(board, now)
                )
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
