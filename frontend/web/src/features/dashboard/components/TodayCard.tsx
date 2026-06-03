// Summary card — today's progress ring and on-track breakdown.

import type { Goal } from "@shared/index"
import { goalTitle, isOnTrack, onTrackFraction } from "../types"
import { RingChart } from "./RingChart"

const DAY_FMT = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
})

export function TodayCard({ goals }: { goals: Goal[] }) {
    const total = goals.length
    if (total === 0) {
        return (
            <div className="card flex items-center gap-6 p-6">
                <RingChart pct={0} label="of today" tone="lime" />
                <div className="flex-1">
                    <div className="eyebrow mb-1.5">TODAY · {DAY_FMT.format(new Date()).toUpperCase()}</div>
                    <div className="mb-1 text-[22px] font-semibold tracking-[-0.02em]">
                        No goals yet
                    </div>
                    <div className="mb-3.5 text-[13px] text-ink-3">
                        Add a goal to start tracking your day.
                    </div>
                </div>
            </div>
        )
    }

    const onTrack = goals.filter((g) => isOnTrack(g))
    const behind = goals.filter((g) => !isOnTrack(g))
    const avg =
        goals.reduce((sum, g) => sum + onTrackFraction(g), 0) / goals.length
    const pct = Math.round(avg * 100)
    const tone = behind.length === 0 ? "lime" : pct >= 50 ? "lime" : "coral"

    const worst = behind.length === 0
        ? null
        : [...behind].sort((a, b) => onTrackFraction(a) - onTrackFraction(b))[0]
    const detail = worst
        ? `${goalTitle(worst)} is behind.`
        : "Everything on track."

    return (
        <div className="card flex items-center gap-6 p-6">
            <RingChart pct={pct} label="of today" tone={tone} />
            <div className="flex-1">
                <div className="eyebrow mb-1.5">
                    TODAY · {DAY_FMT.format(new Date()).toUpperCase()}
                </div>
                <div className="mb-1 text-[22px] font-semibold tracking-[-0.02em]">
                    {onTrack.length} of {total} on track
                </div>
                <div className="mb-3.5 text-[13px] text-ink-3">{detail}</div>
                <div className="flex gap-2">
                    <span className="chip bg-lime-soft text-lime-ink">
                        <span className="dot-lime" /> {onTrack.length} good
                    </span>
                    {behind.length > 0 && (
                        <span className="chip bg-coral-soft text-coral-ink">
                            <span className="dot-coral" /> {behind.length} behind
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
