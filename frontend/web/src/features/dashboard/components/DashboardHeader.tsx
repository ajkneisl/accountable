// Greeting row at the top of the dashboard.

import { Link } from "react-router-dom"

export function DashboardHeader() {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 28
            }}
        >
            <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                    WED · MAY 14 · 6:42 PM
                </div>
                <h1 className="display" style={{ fontSize: 40, margin: 0 }}>
                    Hey Lukas.{" "}
                    <span style={{ color: "var(--ink-3)" }}>
                        3 of 4 goals on track.
                    </span>
                </h1>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-line btn-sm">Add source</button>
                <Link to="/onboarding" className="btn btn-primary btn-sm">
                    + New goal
                </Link>
            </div>
        </div>
    )
}
