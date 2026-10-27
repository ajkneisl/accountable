// A read-only goal card: this week's total against the weekly target (today's
// value against the daily target for a daily goal), a Mon–Sun chart, and pace.
// [fill] stretches the chart to the card's height for widgets.

import type { Goal } from "@shared/index"
import {
    PACE_LABEL,
    dailyTarget,
    formatAmount,
    formatWeekRange,
    goalFill,
    goalTitle,
    integrationVisual,
    isLimit,
    localWeekday,
    meetsTarget,
    paceStatusFor,
    unitLabel,
    weeklyTarget
} from "../format"
import { WeekChart } from "./WeekChart"
import { Badge, Dot } from "./primitives"

export function GoalCard({
    goal,
    fill = false
}: {
    goal: Goal
    fill?: boolean
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
    const daysHit = goal.weekVals
        .slice(0, today + 1)
        .filter((v) => meetsTarget(goal, v, goal.target)).length

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
                        {goal.competition && ` · ${goal.competition.name}`}
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
                limit={isLimit(goal.integration, goal.metric)}
                color={goalFill(goal)}
                className={fill ? "min-h-[4em] flex-1" : "h-[5.7em]"}
            />

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
                    {daily ? `${daysHit}/${today + 1} days` : `${pct}%`}
                </div>
            </div>
        </div>
    )
}
