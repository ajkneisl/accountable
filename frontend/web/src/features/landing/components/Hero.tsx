// Landing hero — headline, CTAs, and the phone preview.

import { Link } from "react-router-dom"
import { HeroPreview } from "./HeroPreview"

export function Hero() {
    return (
        <section
            style={{
                padding: "40px 64px 80px",
                display: "grid",
                gridTemplateColumns: "1.05fr 1fr",
                gap: 60,
                alignItems: "center"
            }}
        >
            <div>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 12px 6px 6px",
                        borderRadius: 999,
                        background: "var(--bg-card)",
                        border: "1px solid var(--line-2)",
                        marginBottom: 28
                    }}
                >
                    <span
                        className="chip"
                        style={{
                            background: "var(--lime)",
                            color: "var(--ink)",
                            padding: "3px 8px"
                        }}
                    >
                        NEW
                    </span>
                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                        Group bets &amp; head-to-head weeks
                    </span>
                    <span style={{ color: "var(--ink-3)", fontSize: 14 }}>
                        ›
                    </span>
                </div>
                <h1
                    className="display"
                    style={{ fontSize: 92, margin: "0 0 24px" }}
                >
                    Goals get done
                    <br />
                    when friends are
                    <br />
                    <span
                        style={{
                            background: "var(--lime)",
                            padding: "0 12px",
                            borderRadius: 12,
                            boxDecorationBreak: "clone"
                        }}
                    >
                        watching.
                    </span>
                </h1>
                <p
                    style={{
                        fontSize: 19,
                        color: "var(--ink-2)",
                        maxWidth: 520,
                        margin: "0 0 32px",
                        lineHeight: 1.5
                    }}
                >
                    Accountable plugs into the tools you already use — GitHub,
                    LeetCode, Apple Health, Screen Time — and keeps you and your
                    friends honest about the goals you set together.
                </p>

                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        marginBottom: 28
                    }}
                >
                    <Link to="/onboarding" className="btn btn-primary btn-lg">
                        Start a goal — free
                    </Link>
                    <Link to="/dashboard" className="btn btn-line btn-lg">
                        See a live dashboard →
                    </Link>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        color: "var(--ink-3)",
                        fontSize: 13
                    }}
                >
                    <div style={{ display: "flex" }}>
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: "50%",
                                    background: [
                                        "var(--coral)",
                                        "var(--lime)",
                                        "var(--ink)",
                                        "var(--bg-sunken)"
                                    ][i],
                                    marginLeft: i ? -8 : 0,
                                    border: "2px solid var(--bg)"
                                }}
                            />
                        ))}
                    </div>
                    <span>
                        <b style={{ color: "var(--ink-2)" }}>4,210 people</b>{" "}
                        stayed on their goals this week.
                    </span>
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    paddingRight: 24
                }}
            >
                <HeroPreview />
            </div>
        </section>
    )
}
