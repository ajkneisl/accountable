// Card wrapping the cumulative daily-score chart.

import { MAR_DAILY, YOU_DAILY } from "../data"
import { DailyScoreChart } from "./DailyScoreChart"

export function DailyScoreCard() {
    return (
        <div className="card" style={{ padding: 24 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 14
                }}
            >
                <div>
                    <div className="eyebrow" style={{ marginBottom: 6 }}>
                        DAILY SCORE
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                        Cumulative points · this week
                    </div>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
                    <span
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                        }}
                    >
                        <span className="dot-lime" /> You
                    </span>
                    <span
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                        }}
                    >
                        <span className="dot-coral" /> Marcus
                    </span>
                </div>
            </div>
            <DailyScoreChart you={YOU_DAILY} marcus={MAR_DAILY} />
        </div>
    )
}
