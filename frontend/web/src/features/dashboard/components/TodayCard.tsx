// Summary card — today's progress ring and on-track breakdown.

import { RingChart } from "./RingChart"

export function TodayCard() {
    return (
        <div
            className="card"
            style={{
                padding: 24,
                display: "flex",
                gap: 24,
                alignItems: "center"
            }}
        >
            <RingChart pct={68} label="of today" tone="lime" />
            <div style={{ flex: 1 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                    TODAY · MAY 14
                </div>
                <div
                    style={{
                        fontSize: 22,
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        marginBottom: 4
                    }}
                >
                    3 of 4 on track
                </div>
                <div
                    style={{
                        fontSize: 13,
                        color: "var(--ink-3)",
                        marginBottom: 14
                    }}
                >
                    LeetCode is behind. 2 problems left to bank.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <span
                        className="chip"
                        style={{
                            background: "var(--lime-soft)",
                            color: "var(--lime-ink)"
                        }}
                    >
                        <span className="dot-lime" /> 3 good
                    </span>
                    <span
                        className="chip"
                        style={{
                            background: "var(--coral-soft)",
                            color: "var(--coral-ink)"
                        }}
                    >
                        <span className="dot-coral" /> 1 behind
                    </span>
                </div>
            </div>
        </div>
    )
}
