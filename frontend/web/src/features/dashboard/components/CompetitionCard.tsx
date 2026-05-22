// Summary card — the live head-to-head competition.

import { Link } from "react-router-dom"

export function CompetitionCard() {
    return (
        <div
            className="card"
            style={{
                padding: 24,
                background: "var(--ink)",
                color: "var(--bg)",
                border: "none"
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14
                }}
            >
                <div className="eyebrow" style={{ color: "var(--lime)" }}>
                    LIVE COMPETITION
                </div>
                <span
                    className="chip"
                    style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "var(--bg)"
                    }}
                >
                    4d left
                </span>
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    marginBottom: 14
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                    }}
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "var(--lime)",
                            color: "var(--ink)",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 700
                        }}
                    >
                        L
                    </div>
                    <div
                        className="mono"
                        style={{
                            fontSize: 36,
                            fontWeight: 700,
                            letterSpacing: "-0.03em"
                        }}
                    >
                        14
                    </div>
                </div>
                <div style={{ opacity: 0.4 }}>vs</div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                    }}
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "var(--coral)",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 700
                        }}
                    >
                        M
                    </div>
                    <div
                        className="mono"
                        style={{
                            fontSize: 36,
                            fontWeight: 700,
                            letterSpacing: "-0.03em",
                            opacity: 0.6
                        }}
                    >
                        11
                    </div>
                </div>
            </div>
            <div
                style={{
                    fontSize: 13,
                    opacity: 0.7,
                    marginBottom: 14
                }}
            >
                You vs Marcus · week 19. Loser buys coffee for a week.
            </div>
            <Link
                to="/competition"
                className="btn btn-accent btn-sm"
                style={{ width: "100%" }}
            >
                Open competition →
            </Link>
        </div>
    )
}
