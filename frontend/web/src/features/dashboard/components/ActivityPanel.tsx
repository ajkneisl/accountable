// Right-hand panel — today's goal status + an "up next" nudge.
// The activity feed mock was removed; the backend does not expose a feed yet.

import type { Goal } from "@shared/index"
import { SourceTile } from "../../common/primitives"
import {
    goalTitle,
    integrationVisual,
    isOnTrack,
    onTrackFraction
} from "../types"

function pluralUnit(goal: Goal, n: number) {
    return n === 1 ? goal.metric.replace(/s$/, "") : goal.metric
}

function GoalRow({ goal }: { goal: Goal }) {
    const visual = integrationVisual(goal.integration)
    const onTrack = isOnTrack(goal)
    return (
        <div className="flex items-center gap-3 border-t border-line-2 py-2.5">
            <SourceTile label={visual.glyph} variant={visual.tile} />
            <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{goalTitle(goal)}</div>
                <div
                    className={`text-[11px] ${
                        onTrack ? "text-lime-ink" : "text-coral-ink"
                    }`}
                >
                    {goal.progress} / {goal.target}{" "}
                    {goal.period === "DAILY" ? "today" : "this week"}
                </div>
            </div>
            <div className="mono text-[11px] text-ink-3">
                {Math.round(onTrackFraction(goal) * 100)}%
            </div>
        </div>
    )
}

export function ActivityPanel({ goals }: { goals: Goal[] }) {
    const behind = goals.filter((g) => !isOnTrack(g))
    const worst = behind.length === 0
        ? null
        : [...behind].sort((a, b) => onTrackFraction(a) - onTrackFraction(b))[0]

    return (
        <aside className="w-[320px] border-l border-line-2 bg-bg px-6 py-7">
            <div className="mb-[18px] flex items-center justify-between">
                <div className="eyebrow">TODAY · STATUS</div>
                <span className="h-2 w-2 rounded-full bg-lime" />
            </div>

            <div className="flex flex-col">
                {goals.length === 0 ? (
                    <div className="border-t border-line-2 py-2.5 text-[13px] text-ink-3">
                        Nothing to track yet.
                    </div>
                ) : (
                    goals.map((g) => (
                        <GoalRow
                            key={`${g.integration}:${g.metric}:${g.period}`}
                            goal={g}
                        />
                    ))
                )}
            </div>

            {worst && (
                <div className="mt-7 rounded-[14px] bg-bg-sunken p-[18px]">
                    <div className="eyebrow mb-2">UP NEXT</div>
                    <div className="mb-1 text-sm font-semibold">
                        {Math.max(0, worst.target - worst.progress)}{" "}
                        more {pluralUnit(worst, Math.max(0, worst.target - worst.progress))}
                    </div>
                    <div className="mb-3 text-xs text-ink-3">
                        To meet your{" "}
                        {worst.period === "DAILY" ? "daily" : "weekly"} goal of{" "}
                        {worst.target}.
                    </div>
                </div>
            )}
        </aside>
    )
}
