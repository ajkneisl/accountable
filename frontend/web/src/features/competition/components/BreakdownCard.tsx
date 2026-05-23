// Card listing the by-source score breakdown.

import { CATS } from "../data"
import { ScoreDelta } from "./ScoreDelta"

export function BreakdownCard() {
    return (
        <div className="card p-6">
            <div className="eyebrow mb-1">BREAKDOWN · BY SOURCE</div>
            <div className="flex justify-between pt-3.5 text-[11px] text-ink-3">
                <span className="ml-[60px]">You</span>
                <span>Marcus</span>
                <span className="w-20" />
            </div>
            {CATS.map((c, i) => (
                <ScoreDelta key={i} {...c} />
            ))}
        </div>
    )
}
