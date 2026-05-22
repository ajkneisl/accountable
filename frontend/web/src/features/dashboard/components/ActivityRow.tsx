// A single line in the live activity feed.

import type { Activity } from "../types"

export function ActivityRow({ a }: { a: Activity }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderTop: "1px solid var(--line-2)"
            }}
        >
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: a.userColor,
                    color: a.userDark ? "#fff" : "var(--ink)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0
                }}
            >
                {a.user[0]}
            </div>
            <div style={{ flex: 1, fontSize: 13 }}>
                <b>{a.user}</b>{" "}
                <span style={{ color: "var(--ink-2)" }}>{a.action}</span>{" "}
                <span style={{ color: "var(--ink-3)" }}>{a.detail}</span>
            </div>
            <div
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)" }}
            >
                {a.time}
            </div>
        </div>
    )
}
