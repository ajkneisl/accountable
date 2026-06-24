// The "Your goals" section — the goal card grid backed by real data.

import { useLocation } from "react-router-dom"
import type { Goal } from "@shared/index"
import { Spinner } from "../../common/primitives"
import { goalAnchorId, goalKey, isOnTrack, isoWeekNumber } from "../types"
import { GoalCard } from "./GoalCard"

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
    // A sidebar goal links here as #goal-<…>; focus the matching card on arrival.
    const focusedAnchor = useLocation().hash.replace(/^#/, "")

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

    const onTrack = goals.filter((g) => isOnTrack(g)).length

    return (
        <>
            <div className="mb-3 flex items-center justify-between">
                <div className="eyebrow flex items-center gap-2">
                    <span>YOUR GOALS · WEEK {week}</span>
                    {loading && <Spinner />}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[12px] text-ink-3">
                        {onTrack} of {goals.length} on track
                    </span>
                    <button
                        type="button"
                        onClick={onNewGoal}
                        className="btn btn-line btn-sm"
                    >
                        + New goal
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                {goals.map((g) => (
                    <GoalCard
                        key={goalKey(g)}
                        goal={g}
                        focused={goalAnchorId(g) === focusedAnchor}
                    />
                ))}
            </div>
        </>
    )
}
