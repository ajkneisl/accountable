// Summary card — streak stats and the last-14-days strip.

import { STREAK_14 } from "../data"
import { Stat } from "./Stat"

export function StreaksCard() {
    return (
        <div className="card p-6">
            <div className="eyebrow mb-3.5">STREAKS</div>
            <div className="grid grid-cols-2 gap-[18px]">
                <Stat
                    label="LONGEST"
                    value="23d"
                    sub="commits · started Apr 21"
                    tone="lime"
                />
                <Stat label="ACTIVE" value="3" sub="of 4 goals streaking" />
            </div>
            <div className="mt-[18px] border-t border-line-2 pt-3.5">
                <div className="mb-2 flex justify-between text-xs text-ink-3">
                    <span>last 14 days</span>
                    <span className="mono">11 / 14 perfect</span>
                </div>
                <div className="streak-row">
                    {STREAK_14.map((s, i) => (
                        <div
                            key={i}
                            className={`streak-dot h-[22px] flex-1 rounded ${s === "today" ? "on today" : s}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
