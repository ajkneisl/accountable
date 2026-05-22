// Landing section 04 — head-to-head competition teaser.

import { Link } from "react-router-dom"

export function CompetitionTease() {
    return (
        <section style={{ padding: "0 64px 96px" }} id="competitions">
            <div
                className="card"
                style={{
                    background: "var(--ink)",
                    color: "var(--bg)",
                    borderRadius: 32,
                    padding: "56px 64px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 60,
                    alignItems: "center",
                    border: "none"
                }}
            >
                <div>
                    <div
                        className="eyebrow"
                        style={{ color: "var(--lime)", marginBottom: 12 }}
                    >
                        04 · HEAD-TO-HEAD
                    </div>
                    <h2
                        className="display"
                        style={{ fontSize: 56, margin: "0 0 20px" }}
                    >
                        Bet your friend.
                        <br />
                        Settle it on Sunday.
                    </h2>
                    <p
                        style={{
                            fontSize: 17,
                            opacity: 0.7,
                            maxWidth: 480,
                            marginBottom: 28,
                            lineHeight: 1.5
                        }}
                    >
                        Drop a weekly score against one friend, or set a bounty:
                        loser buys coffee, loser writes a postcard, loser owns
                        it in the group chat. Stakes optional. Pride mandatory.
                    </p>
                    <Link to="/competition" className="btn btn-accent btn-lg">
                        Start a competition →
                    </Link>
                </div>

                <div
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: 20,
                        padding: 28,
                        border: "1px solid rgba(255,255,255,0.08)"
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 24,
                            fontSize: 12
                        }}
                    >
                        <span className="mono" style={{ opacity: 0.6 }}>
                            WEEK 19 · WED EVENING
                        </span>
                        <span
                            className="chip"
                            style={{
                                background: "rgba(255,255,255,0.08)",
                                color: "var(--bg)"
                            }}
                        >
                            <span className="dot-lime" /> live
                        </span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 28
                        }}
                    >
                        <div style={{ textAlign: "center" }}>
                            <div
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: "50%",
                                    background: "var(--lime)",
                                    color: "var(--ink)",
                                    display: "grid",
                                    placeItems: "center",
                                    fontWeight: 700,
                                    fontSize: 24,
                                    margin: "0 auto 10px"
                                }}
                            >
                                L
                            </div>
                            <div style={{ fontSize: 13, opacity: 0.7 }}>
                                you
                            </div>
                            <div
                                className="mono"
                                style={{
                                    fontSize: 56,
                                    fontWeight: 700,
                                    letterSpacing: "-0.04em",
                                    lineHeight: 1
                                }}
                            >
                                14
                            </div>
                        </div>
                        <div style={{ fontSize: 20, opacity: 0.4 }}>vs</div>
                        <div style={{ textAlign: "center" }}>
                            <div
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: "50%",
                                    background: "var(--coral)",
                                    color: "#fff",
                                    display: "grid",
                                    placeItems: "center",
                                    fontWeight: 700,
                                    fontSize: 24,
                                    margin: "0 auto 10px"
                                }}
                            >
                                M
                            </div>
                            <div style={{ fontSize: 13, opacity: 0.7 }}>
                                marcus
                            </div>
                            <div
                                className="mono"
                                style={{
                                    fontSize: 56,
                                    fontWeight: 700,
                                    letterSpacing: "-0.04em",
                                    lineHeight: 1,
                                    opacity: 0.6
                                }}
                            >
                                11
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8
                        }}
                    >
                        {["Commits", "LeetCode", "Workouts", "Screen time"].map(
                            (row, i) => (
                                <div
                                    key={row}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        fontSize: 12
                                    }}
                                >
                                    <span
                                        style={{ width: 84, opacity: 0.7 }}
                                    >
                                        {row}
                                    </span>
                                    <div
                                        style={{
                                            flex: 1,
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: 6
                                        }}
                                    >
                                        <div
                                            className="bar"
                                            style={{
                                                height: 6,
                                                background:
                                                    "rgba(255,255,255,0.08)"
                                            }}
                                        >
                                            <i
                                                style={{
                                                    width:
                                                        [80, 40, 100, 60][i] +
                                                        "%",
                                                    background: "var(--lime)"
                                                }}
                                            />
                                        </div>
                                        <div
                                            className="bar"
                                            style={{
                                                height: 6,
                                                background:
                                                    "rgba(255,255,255,0.08)"
                                            }}
                                        >
                                            <i
                                                style={{
                                                    width:
                                                        [60, 90, 30, 80][i] +
                                                        "%",
                                                    background:
                                                        "var(--coral)"
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                    <div
                        style={{
                            marginTop: 22,
                            paddingTop: 18,
                            borderTop: "1px solid rgba(255,255,255,0.08)",
                            fontSize: 12,
                            opacity: 0.7,
                            display: "flex",
                            justifyContent: "space-between"
                        }}
                    >
                        <span>Stakes · loser buys coffee × 1 week</span>
                        <span className="mono">4 days left</span>
                    </div>
                </div>
            </div>
        </section>
    )
}
