// Summary card — streak stats and the last-14-days strip.

import type { DayStatus, Goal } from "@shared/index"
import { isOnTrack } from "../types"
import { Stat } from "./Stat"

/** Map a backend day-status to the CSS class used by the strip. */
function statusClass(s: DayStatus): string {
    if (s === "TODAY") return "on today"
    if (s === "ON") return "on"
    if (s === "MISS") return "miss"
    return ""
}

export function StreaksCard({
    streak,
    history,
    goals
}: {
    streak: number
    history: DayStatus[]
    goals: Goal[]
}) {
    const perfect = history.filter((s) => s === "ON" || s === "TODAY").length
    const totalRated = history.filter((s) => s !== "NONE").length
    const activeOnTrack = goals.filter((g) => isOnTrack(g)).length

    return (
        <div className="card p-6">
            <div className="eyebrow mb-3.5">STREAKS</div>
            <div className="grid grid-cols-2 gap-[18px]">
                <Stat
                    label="CURRENT"
                    value={`${streak}d`}
                    sub={
                        streak === 0
                            ? "no streak yet"
                            : "consecutive perfect days"
                    }
                    tone="lime"
                />
                <Stat
                    label="ON TRACK"
                    value={`${activeOnTrack}`}
                    sub={`of ${goals.length} goals today`}
                />
            </div>
            <div className="mt-[18px] border-t border-line-2 pt-3.5">
                <div className="mb-2 flex justify-between text-xs text-ink-3">
                    <span>last {history.length} days</span>
                    <span className="mono">
                        {perfect} / {totalRated || history.length} perfect
                    </span>
                </div>
                <div className="streak-row">
                    {history.map((s, i) => (
                        <div
                            key={i}
                            className={`streak-dot h-[22px] flex-1 rounded ${statusClass(s)}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
