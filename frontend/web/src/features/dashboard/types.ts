// Display helpers for rendering real backend Goal data on the dashboard.

import type { Goal } from "@shared/index"
import type { TileVariant } from "../common/primitives"

/** Stable per-integration display badge. */
export const INTEGRATION_VISUAL: Record<
    string,
    { glyph: string; tile: TileVariant; sourceLabel: string }
> = {
    github: { glyph: "GH", tile: "ink", sourceLabel: "GitHub" },
    leetcode: { glyph: "LC", tile: "lime", sourceLabel: "LeetCode" },
    apple_fitness: { glyph: "F", tile: "coral", sourceLabel: "Fitness" }
}

const FALLBACK_VISUAL = {
    glyph: "?",
    tile: "" as TileVariant,
    sourceLabel: "Unknown"
}

export function integrationVisual(integration: string) {
    return INTEGRATION_VISUAL[integration] ?? FALLBACK_VISUAL
}

/** Pretty unit name for a (integration, metric) pair. */
export function unitLabel(integration: string, metric: string): string {
    if (integration === "github" && metric === "commits") return "commits"
    if (integration === "leetcode") return `${metric} problems`
    if (integration === "apple_fitness" && metric === "workouts")
        return "workouts"
    if (integration === "apple_fitness" && metric === "calories")
        return "calories"
    return metric
}

/** Stable identity for a goal, used for React keys and hash navigation. */
export function goalKey(goal: {
    integration: string
    metric: string
    period: string
}): string {
    return `${goal.integration}:${goal.metric}:${goal.period}`
}

/** DOM id / URL hash anchor for a goal's card on the dashboard (no colons). */
export function goalAnchorId(goal: {
    integration: string
    metric: string
    period: string
}): string {
    return `goal-${goal.integration}-${goal.metric}-${goal.period}`
}

/** "Ship 5 commits / week" style label. */
export function goalTitle(goal: Goal): string {
    const unit = unitLabel(goal.integration, goal.metric)
    const cadence = goal.period === "DAILY" ? "day" : "week"
    return `${goal.target} ${unit} / ${cadence}`
}

/** Compact "Jun 3, 2:14 PM" style stamp for when an integration last refreshed. */
export function formatRefreshed(ms: number): string {
    return new Date(ms).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    })
}

/** "Jun 16 – 22" / "Jun 30 – Jul 6" label for the Monday-anchored week starting at [weekStart]. */
export function formatWeekRange(weekStart: number): string {
    const start = new Date(weekStart)
    const end = new Date(weekStart + 6 * 86_400_000)
    const startStr = start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
    })
    const endStr = end.toLocaleDateString(
        undefined,
        start.getMonth() === end.getMonth()
            ? { day: "numeric" }
            : { month: "short", day: "numeric" }
    )
    return `${startStr} – ${endStr}`
}

/** ISO-8601 week number (1–53) for the given date. */
export function isoWeekNumber(d: Date): number {
    const utc = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    )
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
    return Math.ceil(((+utc - +yearStart) / 86400000 + 1) / 7)
}

/** Day-of-ISO-week (Mon=1..Sun=7) for the current UTC instant. */
export function dayOfIsoWeek(now = Date.now()): number {
    const d = new Date(now)
    const isoDow = d.getUTCDay() // 0=Sun..6=Sat
    return isoDow === 0 ? 7 : isoDow
}

/**
 * Target value the user should have reached by *now* to be considered on track:
 * - DAILY: the full target
 * - WEEKLY: prorated target × (days-into-week / 7)
 */
export function targetByNow(goal: Goal, now = Date.now()): number {
    if (goal.period === "DAILY") return goal.target
    const dow = dayOfIsoWeek(now)
    return (goal.target * dow) / 7
}

/** True iff [goal.progress] meets the prorated [targetByNow]. */
export function isOnTrack(goal: Goal, now = Date.now()): boolean {
    return goal.progress >= targetByNow(goal, now)
}

/** Fraction of target hit *so far in the current window*, clamped to [0, 1]. */
export function onTrackFraction(goal: Goal, now = Date.now()): number {
    const target = targetByNow(goal, now)
    if (target <= 0) return 1
    return Math.min(1, goal.progress / target)
}
