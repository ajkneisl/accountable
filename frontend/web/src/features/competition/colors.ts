// Per-participant colors, shared by the member-streaks chart and every goal board
// so a given person reads as the same color everywhere in a competition.

// Distinct, evenly-spaced hues.
export const BAR_COLORS = [
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

/**
 * Build a stable participant→color map keyed by member order, so each person
 * keeps one color across the streaks chart and all goal boards regardless of
 * how a particular view happens to sort them.
 */
export function buildColorMap(userIDs: string[]): Record<string, string> {
    const map: Record<string, string> = {}
    userIDs.forEach((id, i) => {
        map[id] = BAR_COLORS[i % BAR_COLORS.length]
    })
    return map
}
