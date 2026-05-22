// A single goal card — progress, weekly chart, watchers.

import { SourceTile } from "../../common/primitives"
import type { GoalData } from "../types"
import { WeekChart } from "./WeekChart"

export function GoalCard({ goal }: { goal: GoalData }) {
    return (
        <div
            className="card"
            style={{
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                minHeight: 280
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center"
                    }}
                >
                    <SourceTile label={goal.g} variant={goal.tile} />
                    <div>
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                letterSpacing: "-0.01em"
                            }}
                        >
                            {goal.name}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--ink-3)"
                            }}
                        >
                            {goal.source}
                        </div>
                    </div>
                </div>
                <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 6 }}
                >
                    ⋯
                </button>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 14
                }}
            >
                <div
                    className="mono"
                    style={{
                        fontSize: 44,
                        fontWeight: 700,
                        letterSpacing: "-0.03em",
                        lineHeight: 1
                    }}
                >
                    {goal.n}
                </div>
                <div
                    style={{
                        fontSize: 13,
                        color: "var(--ink-3)",
                        marginBottom: 6
                    }}
                >
                    / {goal.target} {goal.unit}
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div
                        className="mono"
                        style={{
                            fontSize: 14,
                            color: goal.deltaPos
                                ? "var(--lime-ink)"
                                : "var(--coral-ink)",
                            fontWeight: 600
                        }}
                    >
                        {goal.deltaPos ? "↑" : "↓"} {goal.delta}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                        vs last wk
                    </div>
                </div>
            </div>

            <WeekChart
                vals={goal.vals}
                target={goal.dailyTarget}
                tone={goal.tone}
            />

            <div
                style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingTop: 10,
                    borderTop: "1px solid var(--line-2)"
                }}
            >
                <div style={{ display: "flex" }}>
                    {goal.watchers.map((w, i) => (
                        <div
                            key={i}
                            style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: w.c,
                                color: w.dark ? "#fff" : "var(--ink)",
                                marginLeft: i ? -6 : 0,
                                border: "2px solid var(--bg-card)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 9,
                                fontWeight: 700
                            }}
                        >
                            {w.l}
                        </div>
                    ))}
                </div>
                <div
                    style={{
                        fontSize: 12,
                        color: "var(--ink-3)",
                        flex: 1
                    }}
                >
                    {goal.watchersLabel}
                </div>
                <div
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-3)" }}
                >
                    🔥 {goal.streak}d
                </div>
            </div>
        </div>
    )
}
