// Display helpers for rendering real backend Goal data. Ported from
// web/src/features/dashboard/types.ts — the logic is platform-agnostic, only the
// TileVariant import differs.

import type { Goal, GoalColor } from "@shared/index"
import type { TileVariant } from "../../ui/primitives"
import { HABIT_PALETTE } from "../habits/grid"

/** Stable per-integration display badge. */
export const INTEGRATION_VISUAL: Record<
    string,
    { glyph: string; tile: TileVariant; sourceLabel: string }
> = {
    github: { glyph: "GH", tile: "ink", sourceLabel: "GitHub" },
    leetcode: { glyph: "LC", tile: "lime", sourceLabel: "LeetCode" },
    apple_fitness: { glyph: "F", tile: "coral", sourceLabel: "Fitness" },
    apple_sleep: { glyph: "Z", tile: "ink", sourceLabel: "Sleep" },
    apple_steps: { glyph: "ST", tile: "lime", sourceLabel: "Steps" },
    screen_time: { glyph: "SC", tile: "coral", sourceLabel: "Screen Time" }
}

const FALLBACK_VISUAL = {
    glyph: "?",
    tile: "" as TileVariant,
    sourceLabel: "Unknown"
}

export function integrationVisual(integration: string) {
    return INTEGRATION_VISUAL[integration] ?? FALLBACK_VISUAL
}

/** Palette color matching each tile, so a goal without its own color looks as it always has. */
const TILE_COLOR: Record<TileVariant, GoalColor> = {
    ink: "INK",
    lime: "LIME",
    coral: "CORAL",
    "": "LIME"
}

/** The goal's chosen accent, or its integration's default. */
export function goalColor(
    goal: Pick<Goal, "integration" | "color">
): GoalColor {
    return goal.color ?? TILE_COLOR[integrationVisual(goal.integration).tile]
}

/** Fill color for {@link goalColor}. */
export function goalFill(goal: Goal): string {
    return HABIT_PALETTE[goalColor(goal)].fill
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
    if (integration === "screen_time" && metric === "minutes") return "hours"
    return metric
}

/**
 * How many stored units make one displayed unit. Sleep and screen time are
 * stored and summed in minutes but set and shown in hours; everything else is
 * shown as stored.
 */
export function unitScale(integration: string, metric: string): number {
    return (integration === "apple_sleep" || integration === "screen_time") &&
        metric === "minutes"
        ? 60
        : 1
}

/**
 * Whether goals on this metric are limits — met by staying at or under the
 * target rather than reaching it. Mirrors the backend's GoalDirection.AT_MOST.
 */
export function isLimit(integration: string, metric: string): boolean {
    return integration === "screen_time" && metric === "minutes"
}

/** Whether [value] meets [target] for this metric, honoring {@link isLimit}. */
export function meetsTarget(
    goal: { integration: string; metric: string },
    value: number,
    target: number
): boolean {
    return isLimit(goal.integration, goal.metric)
        ? value <= target
        : value >= target
}

/**
 * A stored metric value in display units, as a short string: "7.5" (hours of
 * sleep, to one decimal), otherwise the rounded count.
 */
export function formatAmount(
    integration: string,
    metric: string,
    value: number
): string {
    const scale = unitScale(integration, metric)
    if (scale === 1) return String(Math.round(value))
    return String(Math.round((value / scale) * 10) / 10)
}

/**
 * Stable identity for a goal, used for React keys. A competition goal is
 * prefixed with its competition, so it can't collide with a personal goal (or
 * another competition's) on the same metric; personal keys are unchanged.
 */
export function goalKey(goal: {
    integration: string
    metric: string
    period: string
    competition?: { id: string } | null
}): string {
    const key = `${goal.integration}:${goal.metric}:${goal.period}`
    return goal.competition ? `${goal.competition.id}:${key}` : key
}

/** "Ship 5 commits / week" style label. */
export function goalTitle(
    goal: Pick<Goal, "integration" | "metric" | "period" | "target">
): string {
    const unit = unitLabel(goal.integration, goal.metric)
    const cadence = goal.period === "DAILY" ? "day" : "week"
    const target = formatAmount(goal.integration, goal.metric, goal.target)
    const limit = isLimit(goal.integration, goal.metric) ? "≤ " : ""
    return `${limit}${target} ${unit} / ${cadence}`
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

/** Weekday (0 = Monday … 6 = Sunday) of [now] in the device's time zone. */
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
 * - atRisk: under the bar, but what's left still fits in the days left,
 *   including today, at the daily share rounded up to a whole unit
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

/**
 * Pace of a weekly [total] against a [weeklyLimit] ({@link isLimit}), the
 * mirror of [paceStatus]:
 * - onTrack: within the limit's share for the days through today (a past
 *   week: within the full limit)
 * - atRisk: past today's share, but still under the weekly limit
 * - behind: over the weekly limit, which no later day can undo
 */
export function limitPaceStatus(
    total: number,
    weeklyLimit: number,
    currentWeek = true,
    now = Date.now()
): PaceStatus {
    if (total > weeklyLimit) return "behind"
    if (!currentWeek) return "onTrack"
    return total <= (weeklyLimit * (localWeekday(now) + 1)) / 7
        ? "onTrack"
        : "atRisk"
}

/** [paceStatus] or [limitPaceStatus], whichever fits the goal's metric. */
export function paceStatusFor(goal: {
    integration: string
    metric: string
}): typeof paceStatus {
    return isLimit(goal.integration, goal.metric) ? limitPaceStatus : paceStatus
}

/**
 * Pace of [goal.progress]. Weekly goals follow [paceStatusFor]; a daily goal is
 * on track once met and only at risk until then, since the day is still
 * running. A daily limit is on track until it's broken, and then can't recover.
 */
export function goalPace(goal: Goal, now = Date.now()): PaceStatus {
    if (goal.period === "DAILY") {
        if (isLimit(goal.integration, goal.metric))
            return goal.progress <= goal.target ? "onTrack" : "behind"
        return goal.progress >= goal.target ? "onTrack" : "atRisk"
    }
    return paceStatusFor(goal)(goal.progress, goal.target, true, now)
}

export function isOnTrack(goal: Goal, now = Date.now()): boolean {
    return goalPace(goal, now) === "onTrack"
}

/**
 * Value the user should reach by the *end of today* to stay on track:
 * - DAILY: the full target
 * - WEEKLY: target × (days through today / 7)
 */
export function targetByNow(goal: Goal, now = Date.now()): number {
    if (goal.period === "DAILY") return goal.target
    return (goal.target * (localWeekday(now) + 1)) / 7
}

/**
 * Fraction of target hit *so far in the current window*, clamped to [0, 1]. A
 * limit is fully on track while within its share, then shrinks as it goes over.
 */
export function onTrackFraction(goal: Goal, now = Date.now()): number {
    const target = targetByNow(goal, now)
    if (isLimit(goal.integration, goal.metric))
        return goal.progress <= target ? 1 : target / goal.progress
    if (target <= 0) return 1
    return Math.min(1, goal.progress / target)
}
