// The "Your goals" section — timeframe filter plus the goal card grid.

import { GOALS } from "../data"
import { GoalCard } from "./GoalCard"

export function GoalsSection() {
    return (
        <>
            <div
                style={{
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}
            >
                <div className="eyebrow">YOUR GOALS · WEEK 19</div>
                <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        style={{ background: "var(--bg-sunken)" }}
                    >
                        Week
                    </button>
                    <button className="btn btn-ghost btn-sm">Month</button>
                    <button className="btn btn-ghost btn-sm">All time</button>
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 16
                }}
            >
                {GOALS.map((g, i) => (
                    <GoalCard key={i} goal={g} />
                ))}
            </div>
        </>
    )
}
