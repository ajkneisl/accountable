// The "Your goals" section — timeframe filter plus the goal card grid.

import { GOALS } from "../data"
import { GoalCard } from "./GoalCard"

export function GoalsSection() {
    return (
        <>
            <div className="mb-3 flex items-center justify-between">
                <div className="eyebrow">YOUR GOALS · WEEK 19</div>
                <div className="flex gap-1.5 text-xs">
                    <button className="btn btn-ghost btn-sm bg-bg-sunken">
                        Week
                    </button>
                    <button className="btn btn-ghost btn-sm">Month</button>
                    <button className="btn btn-ghost btn-sm">All time</button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                {GOALS.map((g, i) => (
                    <GoalCard key={i} goal={g} />
                ))}
            </div>
        </>
    )
}
