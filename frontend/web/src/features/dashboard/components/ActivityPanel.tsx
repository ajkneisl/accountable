// Right-hand panel — live activity feed, up-next, and a friend nudge.

import { ACTIVITY } from "../data"
import { ActivityRow } from "./ActivityRow"

export function ActivityPanel() {
    return (
        <aside
            style={{
                width: 320,
                borderLeft: "1px solid var(--line-2)",
                padding: "28px 24px",
                background: "var(--bg)"
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 18
                }}
            >
                <div className="eyebrow">ACTIVITY · LIVE</div>
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--lime)"
                    }}
                />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
                {ACTIVITY.map((a, i) => (
                    <ActivityRow key={i} a={a} />
                ))}
            </div>

            <div
                style={{
                    marginTop: 28,
                    padding: 18,
                    background: "var(--bg-sunken)",
                    borderRadius: 14
                }}
            >
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                    UP NEXT
                </div>
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 4
                    }}
                >
                    Solve 2 more LeetCode
                </div>
                <div
                    style={{
                        fontSize: 12,
                        color: "var(--ink-3)",
                        marginBottom: 12
                    }}
                >
                    To stay on today&#39;s plan. ~24 min based on your average.
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    style={{ width: "100%" }}
                >
                    Open LeetCode →
                </button>
            </div>

            <div
                style={{
                    marginTop: 18,
                    padding: 18,
                    border: "1px dashed var(--line)",
                    borderRadius: 14
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8
                    }}
                >
                    <div
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "var(--coral)",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 11,
                            fontWeight: 600
                        }}
                    >
                        M
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Marcus nudged you
                    </div>
                </div>
                <div
                    style={{
                        fontSize: 13,
                        color: "var(--ink-2)",
                        marginBottom: 12
                    }}
                >
                    “two leetcodes is like 20 minutes lol”
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    <button
                        className="btn btn-line btn-sm"
                        style={{ flex: 1, padding: "6px 10px" }}
                    >
                        👍 ok ok
                    </button>
                    <button
                        className="btn btn-line btn-sm"
                        style={{ flex: 1, padding: "6px 10px" }}
                    >
                        Reply
                    </button>
                </div>
            </div>
        </aside>
    )
}
