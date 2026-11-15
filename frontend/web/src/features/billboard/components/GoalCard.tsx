// A read-only goal card: this week's total against the weekly target (today's
// value against the daily target for a daily goal), a Mon–Sun chart, and pace.
// As in the app, a weekly goal adds a bar of the week's total with a tick where
// it should be by today. [fill] stretches the chart to the card's height for
// widgets.

import { type Goal, requiredDaysOf } from "@shared/index"
import {
    PACE_LABEL,
    dailyTarget,
    formatAmount,
    formatWeekRange,
    goalFill,
    goalOnFill,
    goalTitle,
    integrationVisual,
    isLimit,
    localWeekday,
    meetsTarget,
    paceBar,
    paceStatusFor,
    unitLabel,
    weeklyTarget
} from "../format"
import { WeekChart } from "./WeekChart"
import { Badge, Dot, PaceTick } from "./primitives"

export function GoalCard({
    goal,
    fill = false,
    grouped = false
}: {
    goal: Goal
    fill?: boolean
    /** The card sits under its competition's heading, so it needn't name it. */
    grouped?: boolean
}) {
    const visual = integrationVisual(goal.integration)
    const unit = unitLabel(goal.integration, goal.metric)
    const wt = weeklyTarget(goal)
    const pace = paceStatusFor(goal)(goal.weekTotal, wt)
    const amount = (v: number) => formatAmount(goal.integration, goal.metric, v)
    const pct = Math.round((goal.weekTotal / Math.max(1, wt)) * 100)

    // Daily goals read per day, not as a ×7 weekly sum: today's value against
    // the daily target, and the days hit so far in place of the percentage.
    const daily = goal.period === "DAILY"
    const today = localWeekday()
    const dueDays = requiredDaysOf(goal).filter((d) => d <= today)
    const daysHit = dueDays.filter((d) =>
        meetsTarget(goal, goal.weekVals[d] ?? 0, goal.target)
    ).length

    // Where a weekly total should be by now: the target spread over the days
    // already over, or for a limit its share through today.
    const limit = isLimit(goal.integration, goal.metric)
    const paceAt = limit ? (wt * (today + 1)) / 7 : paceBar(wt)

    return (
        <div
            className={`card flex flex-col gap-[1.25em] p-[1.55em] ${
                fill ? "h-full min-h-0 overflow-hidden" : ""
            }`}
        >
            <div className="flex items-center gap-[0.85em]">
                <Badge integration={goal.integration} />
                <div className="min-w-0">
                    <div className="truncate text-[1.15em] font-semibold tracking-[-0.01em]">
                        {goalTitle(goal)}
                    </div>
                    <div className="truncate text-[0.85em] text-ink-3">
                        {visual.sourceLabel}
                        {goal.competition &&
                            !grouped &&
                            ` · ${goal.competition.name}`}
                    </div>
                </div>
            </div>

            <div className="flex items-end gap-[0.75em]">
                <div className="mono text-[3.1em] font-bold leading-none tracking-[-0.03em]">
                    {amount(
                        daily ? (goal.weekVals[today] ?? 0) : goal.weekTotal
                    )}
                </div>
                <div className="mb-[0.35em] text-[0.95em] text-ink-3">
                    / {amount(daily ? goal.target : wt)} {unit}{" "}
                    {daily ? "today" : "this week"}
                </div>
            </div>

            <WeekChart
                vals={goal.weekVals}
                target={dailyTarget(goal)}
                limit={limit}
                color={goalFill(goal)}
                className={fill ? "min-h-[4em] flex-1" : "h-[5.7em]"}
            />

            {/* The fill reaching the tick means on pace (for a limit, staying
                short of it). */}
            {!daily && (
                <div
                    className="bar h-[0.6em] shrink-0"
                    role="img"
                    aria-label={`${pct}% of the weekly ${limit ? "limit" : "target"}`}
                >
                    <i
                        style={{
                            width: `${Math.min(100, pct)}%`,
                            background: goalFill(goal)
                        }}
                    />
                    <PaceTick
                        at={(paceAt / Math.max(1, wt)) * 100}
                        filled={goal.weekTotal >= paceAt}
                        on={goalOnFill(goal)}
                    />
                </div>
            )}

            <div className="mt-auto flex items-center gap-[0.6em] border-t border-line-2 pt-[0.75em] text-[0.85em] text-ink-3">
                <Dot
                    color={
                        pace === "behind"
                            ? "var(--coral)"
                            : pace === "atRisk"
                              ? "var(--ink-3)"
                              : "var(--lime)"
                    }
                />
                <div className="flex-1">{PACE_LABEL[pace]}</div>
                <div className="mono">
                    {formatWeekRange(goal.weekStart)} ·{" "}
                    {daily ? `${daysHit} of ${dueDays.length} days` : `${pct}%`}
                </div>
            </div>
        </div>
    )
}
