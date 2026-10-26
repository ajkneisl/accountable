// Per-member colors, shared by the standings and every goal board. Each user
// picks theirs in Settings (the server hands out a default until they do), so a
// person reads as the same color in every competition.

import type { CompetitionMember, HabitColor } from "@shared/index"
import { colors } from "../../theme"
import { HABIT_PALETTE } from "../habits/grid"

export const FALLBACK_BAR_COLOR = colors.ink3

/** Fill for a member's [color]. */
export function memberFill(color: HabitColor): string {
    return HABIT_PALETTE[color]?.fill ?? FALLBACK_BAR_COLOR
}

/** Text that reads on top of a member's fill, e.g. their rank number. */
export function onMemberFill(fill: string): string {
    const entry = Object.values(HABIT_PALETTE).find((p) => p.fill === fill)
    return entry?.dark ? colors.bg : colors.ink
}

/** Member id → fill, for views that only have the id to hand. */
export function buildColorMap(
    members: Pick<CompetitionMember, "userID" | "color">[]
): Record<string, string> {
    const map: Record<string, string> = {}
    for (const m of members) map[m.userID] = memberFill(m.color)
    return map
}
