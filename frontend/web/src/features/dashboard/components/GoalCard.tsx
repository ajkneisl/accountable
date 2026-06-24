// A single goal card — progress, a fixed Mon–Sun week chart, and per-goal week navigation.

import { useEffect, useState } from "react"
import { type Goal, type GoalWeek, getGoalWeek, useApi } from "@shared/index"
import { IntegrationIcon, SourceTile } from "../../common/primitives"
import {
    dayOfIsoWeek,
    formatWeekRange,
    goalTitle,
    integrationVisual,
    unitLabel
} from "../types"
import { WeekChart } from "./WeekChart"

/**
 * Per-day target used for the bar-chart's dashed reference line.
 * - DAILY goals: the full target each day.
 * - WEEKLY goals: target spread evenly across 7 days.
 */
function dailyTargetFor(goal: Goal): number {
    return goal.period === "DAILY" ? goal.target : goal.target / 7
}

/** Weekly-equivalent target: weekly goals as-is, daily goals × 7. */
function weeklyTargetFor(goal: Goal): number {
    return goal.period === "WEEKLY" ? goal.target : goal.target * 7
}

export function GoalCard({ goal }: { goal: Goal }) {
    const api = useApi()
    const visual = integrationVisual(goal.integration)
    const unit = unitLabel(goal.integration, goal.metric)

    // 0 = current week, 1 = last week, … Drives the per-goal week navigation.
    const [offset, setOffset] = useState(0)
    const [week, setWeek] = useState<GoalWeek | null>(null)

    useEffect(() => {
        let cancelled = false
        getGoalWeek(api, goal.integration, goal.metric, goal.period, offset)
            .then((w) => {
                if (!cancelled) setWeek(w)
            })
            .catch(() => {
                if (!cancelled) setWeek(null)
            })
        return () => {
            cancelled = true
        }
    }, [api, goal.integration, goal.metric, goal.period, offset])

    // Fall back to the dashboard payload until the week request resolves.
    const vals = week?.vals ?? goal.vals
    const total = week?.total ?? goal.progress
    const weeklyTarget = weeklyTargetFor(goal)

    // On track: the current week prorates the target by how far into the week we
    // are; a completed past week compares against the full weekly target.
    const proratedTarget =
        offset === 0 ? (weeklyTarget * dayOfIsoWeek()) / 7 : weeklyTarget
    const onTrack = total >= proratedTarget
    const tone = onTrack ? visual.tile || "lime" : "coral"

    const rangeLabel = week ? formatWeekRange(week.weekStart) : "—"

    return (
        <div className="card flex min-h-[280px] flex-col gap-[18px] p-[22px]">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <SourceTile
                        label={visual.glyph}
                        variant={visual.tile}
                        icon={<IntegrationIcon name={goal.integration} />}
                    />
                    <div>
                        <div className="text-base font-semibold tracking-[-0.01em]">
                            {goalTitle(goal)}
                        </div>
                        <div className="text-xs text-ink-3">
                            {visual.sourceLabel} · {goal.metric}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 text-ink-3">
                    <button
                        type="button"
                        aria-label="Previous week"
                        onClick={() => setOffset((o) => o + 1)}
                        className="rounded px-1.5 text-sm hover:text-ink-1"
                    >
                        ‹
                    </button>
                    <span className="mono whitespace-nowrap text-[11px]">
                        {offset === 0 ? "This week" : rangeLabel}
                    </span>
                    <button
                        type="button"
                        aria-label="Next week"
                        onClick={() => setOffset((o) => Math.max(0, o - 1))}
                        disabled={offset === 0}
                        className="rounded px-1.5 text-sm enabled:hover:text-ink-1 disabled:opacity-30"
                    >
                        ›
                    </button>
                </div>
            </div>

            <div className="flex items-end gap-3.5">
                <div className="mono text-[44px] font-bold leading-none tracking-[-0.03em]">
                    {total}
                </div>
                <div className="mb-1.5 text-[13px] text-ink-3">
                    / {weeklyTarget} {unit} ·{" "}
                    {offset === 0 ? "this week" : rangeLabel}
                </div>
            </div>

            <WeekChart
                vals={vals}
                target={dailyTargetFor(goal)}
                tone={tone}
            />

            <div className="mt-auto flex items-center gap-2.5 border-t border-line-2 pt-2.5 text-xs text-ink-3">
                <div className="flex-1">
                    {onTrack ? "On track" : "Behind pace"}
                </div>
                <div className="mono text-[11px] text-ink-3">
                    {Math.round((total / Math.max(1, weeklyTarget)) * 100)}%
                </div>
            </div>
        </div>
    )
}
