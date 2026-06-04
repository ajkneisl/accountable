// The "Your goals" section — the goal card grid backed by real data.

import type { Goal } from "@shared/index"
import { Spinner } from "../../common/primitives"
import { GoalCard } from "./GoalCard"

function isoWeekNumber(d: Date): number {
    const utc = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    )
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
    return Math.ceil(((+utc - +yearStart) / 86400000 + 1) / 7)
}

export function GoalsSection({
    goals,
    onNewGoal,
    loading = false
}: {
    goals: Goal[]
    onNewGoal: () => void
    loading?: boolean
}) {
    const week = isoWeekNumber(new Date())

    if (goals.length === 0) {
        return (
            <>
                <div className="mb-3 flex items-center justify-between">
                    <div className="eyebrow flex items-center gap-2">
                        <span>YOUR GOALS</span>
                        {loading && <Spinner />}
                    </div>
                </div>
                <div className="card flex flex-col items-start gap-3 p-6">
                    <div className="text-[15px] font-semibold">
                        {loading ? "Loading goals…" : "No goals yet."}
                    </div>
                    <div className="text-[13px] text-ink-3">
                        Add a goal to start tracking your commits, LeetCode
                        problems, and more.
                    </div>
                    <button
                        type="button"
                        onClick={onNewGoal}
                        className="btn btn-primary btn-sm"
                    >
                        + New goal
                    </button>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="mb-3 flex items-center justify-between">
                <div className="eyebrow flex items-center gap-2">
                    <span>YOUR GOALS · WEEK {week}</span>
                    {loading && <Spinner />}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                {goals.map((g) => (
                    <GoalCard
                        key={`${g.integration}:${g.metric}:${g.period}`}
                        goal={g}
                    />
                ))}
            </div>
        </>
    )
}
