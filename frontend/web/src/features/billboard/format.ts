// Display helpers for goal data. Mirrors app/src/features/dashboard/types.ts so a
// goal reads (and paces) the same on the billboard as it does in the app.

import type { Goal, GoalColor, Habit } from "@shared/index"
import type { TileVariant } from "../common/primitives"
import { HABIT_PALETTE } from "./grid"

/** Palette color matching each tile, so a goal without its own color looks as it always has. */
const TILE_COLOR: Record<TileVariant, GoalColor> = {
    ink: "INK",
    lime: "LIME",
    coral: "CORAL",
    "": "LIME"
}

/** Fill for the goal's chosen accent, or its integration's default. */
export function goalFill(goal: Goal): string {
    const color =
        goal.color ?? TILE_COLOR[integrationVisual(goal.integration).tile]
    return HABIT_PALETTE[color].fill
}

/** "12d streak · 40 days" summary line for a habit. */
export function streakLabel(habit: Habit): string {
    const streak =
        habit.streak === 0 ? "no streak yet" : `${habit.streak}d streak`
    return `${streak} · ${habit.total} days`
}

/** Stable per-integration display badge. */
const INTEGRATION_VISUAL: Record<
    string,
    { glyph: string; tile: TileVariant; sourceLabel: string }
> = {
    github: { glyph: "GH", tile: "ink", sourceLabel: "GitHub" },
    leetcode: { glyph: "LC", tile: "lime", sourceLabel: "LeetCode" },
    apple_fitness: { glyph: "F", tile: "coral", sourceLabel: "Fitness" },
    apple_sleep: { glyph: "Z", tile: "ink", sourceLabel: "Sleep" },
    apple_steps: { glyph: "ST", tile: "lime", sourceLabel: "Steps" }
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
    if (integration === "apple_sleep" && metric === "minutes") return "hours"
    if (integration === "apple_steps" && metric === "steps") return "steps"
    return metric
}

/**
 * How many stored units make one displayed unit. Sleep is stored and summed in
 * minutes but set and shown in hours; everything else is shown as stored.
 */
function unitScale(integration: string, metric: string): number {
    return integration === "apple_sleep" && metric === "minutes" ? 60 : 1
}

/** A stored metric value in display units: "7.5" hours of sleep, otherwise the rounded count. */
export function formatAmount(
    integration: string,
    metric: string,
    value: number
): string {
    const scale = unitScale(integration, metric)
    if (scale === 1) return String(Math.round(value))
    return String(Math.round((value / scale) * 10) / 10)
}

/** Stable identity for a goal or shared goal, used for React keys. */
export function goalKey(goal: {
    integration: string
    metric: string
    period: string
}): string {
    return `${goal.integration}:${goal.metric}:${goal.period}`
}

/** "5 commits / week" style label. */
export function goalTitle(goal: {
    integration: string
    metric: string
    period: string
    target: number
}): string {
    const unit = unitLabel(goal.integration, goal.metric)
    const cadence = goal.period === "DAILY" ? "day" : "week"
    const target = formatAmount(goal.integration, goal.metric, goal.target)
    return `${target} ${unit} / ${cadence}`
}

/** Weekly-equivalent target: weekly goals as-is, daily goals × 7. */
export function weeklyTarget(goal: { period: string; target: number }): number {
    return goal.period === "WEEKLY" ? goal.target : goal.target * 7
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

/** "2:14 PM" style clock time. */
export function formatTime(ms: number): string {
    return new Date(ms).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit"
    })
}

/** Weekday (0 = Monday … 6 = Sunday) of [now] in the browser's time zone. */
export function localWeekday(now = Date.now()): number {
    return (new Date(now).getDay() + 6) % 7
}

export type PaceStatus = "onTrack" | "atRisk" | "behind"

/**
 * What a weekly total must have reached to be on track: the target spread
 * evenly over the days already over. Today doesn't count against you until it
 * ends, so Monday's bar is 0.
 */
export function paceBar(weeklyTarget: number, now = Date.now()): number {
    return (weeklyTarget * localWeekday(now)) / 7
}

/**
 * Pace of a weekly [total] toward [weeklyTarget]:
 * - onTrack: at or above the [paceBar] (a past week: the full target is met)
 * - atRisk: under the bar, but what's left still fits in the days left
 * - behind: what's left no longer fits (a past week: the target was missed)
 */
export function paceStatus(
    total: number,
    weeklyTarget: number,
    currentWeek = true,
    now = Date.now()
): PaceStatus {
    if (!currentWeek) return total >= weeklyTarget ? "onTrack" : "behind"
    if (total >= paceBar(weeklyTarget, now)) return "onTrack"
    const daysLeft = 7 - localWeekday(now)
    const perDay = Math.max(1, Math.ceil(weeklyTarget / 7))
    return weeklyTarget - total <= perDay * daysLeft ? "atRisk" : "behind"
}

export const PACE_LABEL: Record<PaceStatus, string> = {
    onTrack: "On track",
    atRisk: "At risk",
    behind: "Behind pace"
}

/** Per-day target for a goal's week chart reference line. */
export function dailyTarget(goal: Goal): number {
    return goal.period === "DAILY" ? goal.target : goal.target / 7
}
