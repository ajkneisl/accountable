// Card listing the by-source score breakdown.

import { CATS } from "../data"
import { ScoreDelta } from "./ScoreDelta"

export function BreakdownCard() {
    return (
        <div className="card" style={{ padding: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
                BREAKDOWN · BY SOURCE
            </div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "var(--ink-3)",
                    padding: "14px 0 0"
                }}
            >
                <span style={{ marginLeft: 60 }}>You</span>
                <span>Marcus</span>
                <span style={{ width: 80 }} />
            </div>
            {CATS.map((c, i) => (
                <ScoreDelta key={i} {...c} />
            ))}
        </div>
    )
}
