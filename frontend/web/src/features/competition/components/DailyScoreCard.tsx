// Card wrapping the cumulative daily-score chart.

import { MAR_DAILY, YOU_DAILY } from "../data"
import { DailyScoreChart } from "./DailyScoreChart"

export function DailyScoreCard() {
    return (
        <div className="card p-6">
            <div className="mb-3.5 flex items-start justify-between">
                <div>
                    <div className="eyebrow mb-1.5">DAILY SCORE</div>
                    <div className="text-[15px] font-semibold">
                        Cumulative points · this week
                    </div>
                </div>
                <div className="flex gap-3.5 text-xs">
                    <span className="flex items-center gap-1.5">
                        <span className="dot-lime" /> You
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="dot-coral" /> Marcus
                    </span>
                </div>
            </div>
            <DailyScoreChart you={YOU_DAILY} marcus={MAR_DAILY} />
        </div>
    )
}
