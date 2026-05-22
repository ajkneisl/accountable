// One event in today's competition timeline.

import type { FeedEvent } from "../types"

export function HourBar({ event }: { event: FeedEvent }) {
    const tone = event.who === "you" ? "var(--lime)" : "var(--coral)"
    const tonebg =
        event.who === "you" ? "var(--lime-soft)" : "var(--coral-soft)"
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: tonebg
            }}
        >
            <div
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)", width: 46 }}
            >
                {event.time}
            </div>
            <div
                style={{
                    width: 4,
                    alignSelf: "stretch",
                    background: tone,
                    borderRadius: 2
                }}
            />
            <div style={{ flex: 1, fontSize: 13 }}>
                <b>{event.who === "you" ? "You" : "Marcus"}</b>{" "}
                <span style={{ color: "var(--ink-2)" }}>{event.text}</span>
            </div>
            <div
                className="mono"
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color:
                        tone === "var(--lime)"
                            ? "var(--lime-ink)"
                            : "var(--coral-ink)"
                }}
            >
                +{event.pts}
            </div>
        </div>
    )
}
