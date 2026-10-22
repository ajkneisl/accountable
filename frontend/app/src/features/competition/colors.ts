// Per-participant colors, shared by the standings and every goal board so a given
// person reads as the same color everywhere in a competition.
//
// Ported from web/src/features/competition/colors.ts; the oklch() literals there
// are pre-converted to sRGB hex for React Native.

import { colors } from "../../theme"

// Distinct, evenly-spaced hues.
export const BAR_COLORS = [
    colors.lime,
    colors.coral,
    colors.indigo,
    "#00a6db", // sky
    "#dfb100", // amber
    "#c849c1", // magenta
    "#00ba87", // teal
    "#d64651" // brick
]

export const FALLBACK_BAR_COLOR = colors.ink3

/** Podium tints for the top three standings rows. */
export const MEDAL = [colors.lime, "#cfb384", colors.coral]

/**
 * Build a stable participant→color map keyed by member order, so each person
 * keeps one color across the standings and all goal boards regardless of how a
 * particular view happens to sort them.
 */
export function buildColorMap(userIDs: string[]): Record<string, string> {
    const map: Record<string, string> = {}
    userIDs.forEach((id, i) => {
        map[id] = BAR_COLORS[i % BAR_COLORS.length]
    })
    return map
}
