// Summary card — today's progress ring and on-track breakdown.

import { RingChart } from "./RingChart"

export function TodayCard() {
    return (
        <div className="card flex items-center gap-6 p-6">
            <RingChart pct={68} label="of today" tone="lime" />
            <div className="flex-1">
                <div className="eyebrow mb-1.5">TODAY · MAY 14</div>
                <div className="mb-1 text-[22px] font-semibold tracking-[-0.02em]">
                    3 of 4 on track
                </div>
                <div className="mb-3.5 text-[13px] text-ink-3">
                    LeetCode is behind. 2 problems left to bank.
                </div>
                <div className="flex gap-2">
                    <span className="chip bg-lime-soft text-lime-ink">
                        <span className="dot-lime" /> 3 good
                    </span>
                    <span className="chip bg-coral-soft text-coral-ink">
                        <span className="dot-coral" /> 1 behind
                    </span>
                </div>
            </div>
        </div>
    )
}
