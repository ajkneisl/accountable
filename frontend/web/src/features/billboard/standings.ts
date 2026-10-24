// Competition scoring and per-member colors, mirroring the app's
// competition/standings.ts and competition/colors.ts.

import type {
    CompetitionDetail,
    CompetitionGoalBoard,
    CompetitionMemberWeek,
    CompetitionWeek
} from "@shared/index"
import { localWeekday, paceBar, weeklyTarget } from "./format"

// Distinct, evenly-spaced hues.
const BAR_COLORS = [
    "var(--lime)",
    "var(--coral)",
    "var(--indigo)",
    "oklch(0.68 0.16 230)", // sky
    "oklch(0.78 0.16 90)", // amber
    "oklch(0.62 0.21 330)", // magenta
    "oklch(0.7 0.15 165)", // teal
    "oklch(0.6 0.18 20)" // brick
]

export const FALLBACK_BAR_COLOR = "var(--ink-3)"

/** Podium tints for the top three standings rows. */
export const MEDAL = ["var(--lime)", "#cfb384", "var(--coral)"]

/**
 * Stable participant→color map keyed by member order, so each person keeps one
 * color across the standings and every goal board.
 */
export function buildColorMap(userIDs: string[]): Record<string, string> {
    const map: Record<string, string> = {}
    userIDs.forEach((id, i) => {
        map[id] = BAR_COLORS[i % BAR_COLORS.length]
    })
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

/** The total a member must have reached by now to be on pace this week. */
export function paceTarget(board: CompetitionGoalBoard, now = Date.now()) {
    return paceBar(weeklyTarget(board), now)
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
                return (mw?.total ?? 0) >= paceTarget(board, now)
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
