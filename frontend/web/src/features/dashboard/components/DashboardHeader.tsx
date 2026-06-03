// Greeting row at the top of the dashboard.

import { Link } from "react-router-dom"
import type { Goal, SelfResponse } from "@shared/index"
import { isOnTrack } from "../types"

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
})

export function DashboardHeader({
    user,
    goals
}: {
    user: SelfResponse | null
    goals: Goal[]
}) {
    const firstName = user?.username ?? "there"
    const onTrack = goals.filter((g) => isOnTrack(g)).length
    const total = goals.length
    const status =
        total === 0
            ? "Set your first goal."
            : `${onTrack} of ${total} goals on track.`

    return (
        <div className="mb-7 flex items-start justify-between">
            <div>
                <div className="eyebrow mb-2 uppercase">
                    {DATE_FMT.format(new Date())}
                </div>
                <h1 className="display m-0 text-[40px]">
                    Hey {firstName}.{" "}
                    <span className="text-ink-3">{status}</span>
                </h1>
            </div>
            <div className="flex gap-2.5">
                <button className="btn btn-line btn-sm">Add source</button>
                <Link to="/onboarding" className="btn btn-primary btn-sm">
                    + New goal
                </Link>
            </div>
        </div>
    )
}
