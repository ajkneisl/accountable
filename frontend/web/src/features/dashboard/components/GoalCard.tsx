// A single goal card — progress, weekly chart, source label.

import type { Goal } from "@shared/index"
import { SourceTile } from "../../common/primitives"
import { goalTitle, integrationVisual, isOnTrack, unitLabel } from "../types"
import { WeekChart } from "./WeekChart"

/**
 * Per-day target used for the bar-chart's dashed reference line.
 * - DAILY goals: the full target each day.
 * - WEEKLY goals: target spread evenly across 7 days.
 */
function dailyTargetFor(goal: Goal): number {
    return goal.period === "DAILY" ? goal.target : goal.target / 7
}

/** Rough "vs last week" delta: this week's total minus last week's, signed. */
function weekDelta(vals: number[]): { text: string; positive: boolean } {
    if (vals.length < 7) return { text: "0", positive: true }
    const thisWeek = vals.reduce((a, b) => a + b, 0)
    // Without 14 days we approximate "last week" as the same as this week.
    // Backend can expand this later — for now show this-week total.
    return { text: `${thisWeek}`, positive: thisWeek > 0 }
}

export function GoalCard({ goal }: { goal: Goal }) {
    const visual = integrationVisual(goal.integration)
    const onTrack = isOnTrack(goal)
    const tone = onTrack ? visual.tile || "lime" : "coral"
    const unit = unitLabel(goal.integration, goal.metric)
    const periodLabel = goal.period === "DAILY" ? "today" : "this week"
    const delta = weekDelta(goal.vals)

    return (
        <div className="card flex min-h-[280px] flex-col gap-[18px] p-[22px]">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <SourceTile label={visual.glyph} variant={visual.tile} />
                    <div>
                        <div className="text-base font-semibold tracking-[-0.01em]">
                            {goalTitle(goal)}
                        </div>
                        <div className="text-xs text-ink-3">
                            {visual.sourceLabel} · {goal.metric}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-end gap-3.5">
                <div className="mono text-[44px] font-bold leading-none tracking-[-0.03em]">
                    {goal.progress}
                </div>
                <div className="mb-1.5 text-[13px] text-ink-3">
                    / {goal.target} {unit} {periodLabel}
                </div>
                <div className="ml-auto text-right">
                    <div
                        className={`mono text-sm font-semibold ${onTrack ? "text-lime-ink" : "text-coral-ink"}`}
                    >
                        {onTrack ? "↑" : "↓"} {delta.text}
                    </div>
                    <div className="text-[11px] text-ink-3">this week</div>
                </div>
            </div>

            <WeekChart
                vals={goal.vals}
                target={dailyTargetFor(goal)}
                tone={tone}
            />

            <div className="mt-auto flex items-center gap-2.5 border-t border-line-2 pt-2.5 text-xs text-ink-3">
                <div className="flex-1">
                    {onTrack ? "On track" : "Behind pace"}
                </div>
                <div className="mono text-[11px] text-ink-3">
                    {Math.round(
                        (goal.progress / Math.max(1, goal.target)) * 100
                    )}
                    %
                </div>
            </div>
        </div>
    )
}
