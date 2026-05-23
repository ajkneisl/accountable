// A single goal card — progress, weekly chart, watchers.

import { SourceTile } from "../../common/primitives"
import type { GoalData } from "../types"
import { WeekChart } from "./WeekChart"

export function GoalCard({ goal }: { goal: GoalData }) {
    return (
        <div className="card flex min-h-[280px] flex-col gap-[18px] p-[22px]">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <SourceTile label={goal.g} variant={goal.tile} />
                    <div>
                        <div className="text-base font-semibold tracking-[-0.01em]">
                            {goal.name}
                        </div>
                        <div className="text-xs text-ink-3">{goal.source}</div>
                    </div>
                </div>
                <button className="btn btn-ghost btn-sm p-1.5">⋯</button>
            </div>

            <div className="flex items-end gap-3.5">
                <div className="mono text-[44px] font-bold leading-none tracking-[-0.03em]">
                    {goal.n}
                </div>
                <div className="mb-1.5 text-[13px] text-ink-3">
                    / {goal.target} {goal.unit}
                </div>
                <div className="ml-auto text-right">
                    <div
                        className={`mono text-sm font-semibold ${goal.deltaPos ? "text-lime-ink" : "text-coral-ink"}`}
                    >
                        {goal.deltaPos ? "↑" : "↓"} {goal.delta}
                    </div>
                    <div className="text-[11px] text-ink-3">vs last wk</div>
                </div>
            </div>

            <WeekChart
                vals={goal.vals}
                target={goal.dailyTarget}
                tone={goal.tone}
            />

            <div className="mt-auto flex items-center gap-2.5 border-t border-line-2 pt-2.5">
                <div className="flex">
                    {goal.watchers.map((w, i) => (
                        <div
                            key={i}
                            className="grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-bg-card text-[9px] font-bold"
                            style={{
                                background: w.c,
                                color: w.dark ? "#fff" : "var(--ink)",
                                marginLeft: i ? -6 : 0
                            }}
                        >
                            {w.l}
                        </div>
                    ))}
                </div>
                <div className="flex-1 text-xs text-ink-3">
                    {goal.watchersLabel}
                </div>
                <div className="mono text-[11px] text-ink-3">
                    🔥 {goal.streak}d
                </div>
            </div>
        </div>
    )
}
