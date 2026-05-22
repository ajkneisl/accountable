// Summary card — streak stats and the last-14-days strip.

import { STREAK_14 } from "../data"
import { Stat } from "./Stat"

export function StreaksCard() {
    return (
        <div className="card" style={{ padding: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
                STREAKS
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 18
                }}
            >
                <Stat
                    label="LONGEST"
                    value="23d"
                    sub="commits · started Apr 21"
                    tone="lime"
                />
                <Stat label="ACTIVE" value="3" sub="of 4 goals streaking" />
            </div>
            <div
                style={{
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: "1px solid var(--line-2)"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                        fontSize: 12,
                        color: "var(--ink-3)"
                    }}
                >
                    <span>last 14 days</span>
                    <span className="mono">11 / 14 perfect</span>
                </div>
                <div className="streak-row">
                    {STREAK_14.map((s, i) => (
                        <div
                            key={i}
                            className={`streak-dot ${s === "today" ? "on today" : s}`}
                            style={{
                                flex: 1,
                                height: 22,
                                borderRadius: 4
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
