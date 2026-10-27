// Per-member colors, shared by the standings and every goal board. Each user
// picks theirs in Settings (the server hands out a default until they do), so a
// person reads as the same color in every competition. Screens pass the scheme
// they're showing; the widgets use the light palette and pick their own dark
// colors.

import type { CompetitionMember, HabitColor } from "@shared/index"
import { onFill, type Scheme } from "../../theme"
import { HABIT_PALETTES } from "../habits/grid"

/** A neutral grey that reads on both the light and dark backgrounds. */
export const FALLBACK_BAR_COLOR = "#8a827b"

/** Fill for a member's [color]. */
export function memberFill(
    color: HabitColor,
    scheme: Scheme = "light"
): string {
    return HABIT_PALETTES[scheme][color]?.fill ?? FALLBACK_BAR_COLOR
}

/** Text that reads on top of a member's fill, e.g. their rank number. */
export function onMemberFill(fill: string, scheme: Scheme = "light"): string {
    const entry = Object.values(HABIT_PALETTES[scheme]).find(
        (p) => p.fill === fill
    )
    return entry?.dark ? onFill.dark : onFill.light
}

/** Member id → fill, for views that only have the id to hand. */
export function buildColorMap(
    members: Pick<CompetitionMember, "userID" | "color">[],
    scheme: Scheme = "light"
): Record<string, string> {
    const map: Record<string, string> = {}
    for (const m of members) map[m.userID] = memberFill(m.color, scheme)
    return map
}
