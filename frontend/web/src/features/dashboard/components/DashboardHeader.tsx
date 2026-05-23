// Greeting row at the top of the dashboard.

import { Link } from "react-router-dom"

export function DashboardHeader() {
    return (
        <div className="mb-7 flex items-start justify-between">
            <div>
                <div className="eyebrow mb-2">WED · MAY 14 · 6:42 PM</div>
                <h1 className="display m-0 text-[40px]">
                    Hey Lukas.{" "}
                    <span className="text-ink-3">3 of 4 goals on track.</span>
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
