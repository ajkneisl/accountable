// Onboarding step 05 — confetti finale with the goal summary.

import { useNavigate } from "react-router-dom"
import { AccLogo, SourceTile } from "../../common/primitives"

const CONFETTI: [number, number, string, number][] = [
    [120, 220, "lime", 10], [1280, 180, "coral", 12], [340, 760, "ink", 8],
    [1180, 720, "lime", 14], [80, 540, "coral", 9], [1340, 460, "ink", 6],
    [220, 380, "coral", 7], [1100, 320, "lime", 11], [400, 100, "ink", 8],
    [1000, 800, "coral", 10], [60, 760, "lime", 8], [1380, 820, "lime", 9],
    [240, 620, "ink", 6], [1180, 580, "coral", 8], [520, 200, "lime", 7]
]

export function StepDone() {
    const navigate = useNavigate()
    return (
        <div
            className="acc"
            style={{
                width: 1440,
                margin: "0 auto",
                minHeight: 900,
                display: "flex",
                flexDirection: "column",
                background: "var(--bg)",
                position: "relative",
                overflow: "hidden"
            }}
        >
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "24px 36px",
                    zIndex: 2
                }}
            >
                <AccLogo />
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14
                    }}
                >
                    <span
                        className="mono"
                        style={{
                            fontSize: 11,
                            color: "var(--ink-3)",
                            letterSpacing: "0.1em"
                        }}
                    >
                        STEP 05 / 05
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: 24,
                                    height: 4,
                                    borderRadius: 2,
                                    background: "var(--ink)"
                                }}
                            />
                        ))}
                    </div>
                </div>
            </header>

            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none"
                }}
            >
                {CONFETTI.map(([x, y, c, sz], i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: x,
                            top: y,
                            width: sz,
                            height: sz,
                            borderRadius: 3,
                            background:
                                c === "lime"
                                    ? "var(--lime)"
                                    : c === "coral"
                                      ? "var(--coral)"
                                      : "var(--ink)",
                            transform: `rotate(${(i * 23) % 90 - 45}deg)`,
                            opacity: 0.8
                        }}
                    />
                ))}
            </div>

            <main
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 36px",
                    zIndex: 1
                }}
            >
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1.1fr",
                        gap: 60,
                        alignItems: "center",
                        maxWidth: 1200
                    }}
                >
                    <div>
                        <div
                            className="eyebrow"
                            style={{
                                marginBottom: 14,
                                color: "var(--lime-ink)"
                            }}
                        >
                            05 · YOU&apos;RE IN
                        </div>
                        <h1
                            className="display"
                            style={{ fontSize: 84, margin: "0 0 22px" }}
                        >
                            You&apos;ve got
                            <br />
                            <span
                                style={{
                                    background: "var(--lime)",
                                    padding: "0 12px",
                                    borderRadius: 12,
                                    boxDecorationBreak: "clone"
                                }}
                            >
                                one goal,
                            </span>
                            <br />
                            one source,
                            <br />
                            two watchers.
                        </h1>
                        <p
                            style={{
                                fontSize: 17,
                                color: "var(--ink-2)",
                                maxWidth: 480,
                                marginBottom: 28,
                                lineHeight: 1.5
                            }}
                        >
                            Marcus and Jess will be notified Sunday with your
                            first-week recap. First thing you should do? Ship a
                            commit. We&apos;re watching.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                type="button"
                                className="btn btn-primary btn-lg"
                                onClick={() => navigate("/dashboard")}
                            >
                                Open dashboard →
                            </button>
                            <button
                                type="button"
                                className="btn btn-line btn-lg"
                            >
                                Take the tour
                            </button>
                        </div>
                        <div
                            className="mono"
                            style={{
                                fontSize: 12,
                                color: "var(--ink-3)",
                                marginTop: 22
                            }}
                        >
                            ⌘ K · open quick add · anywhere
                        </div>
                    </div>

                    <div
                        className="card"
                        style={{
                            padding: 28,
                            borderRadius: 20,
                            boxShadow: "var(--shadow-lg)"
                        }}
                    >
                        <div
                            className="eyebrow"
                            style={{ marginBottom: 18 }}
                        >
                            YOUR SETUP
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                paddingBottom: 18,
                                borderBottom: "1px solid var(--line-2)"
                            }}
                        >
                            <SourceTile label="GH" variant="ink" />
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 700
                                    }}
                                >
                                    Ship 5 commits / week
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "var(--ink-3)"
                                    }}
                                >
                                    GitHub · @lkroon · Mon → Sun
                                </div>
                            </div>
                            <span
                                className="chip"
                                style={{
                                    background: "var(--lime-soft)",
                                    color: "var(--lime-ink)"
                                }}
                            >
                                active
                            </span>
                        </div>

                        <div
                            style={{
                                padding: "18px 0",
                                borderBottom: "1px solid var(--line-2)"
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "var(--ink-3)",
                                    marginBottom: 10
                                }}
                            >
                                watchers
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                {[
                                    { l: "L", c: "var(--lime)", n: "You" },
                                    {
                                        l: "M",
                                        c: "var(--coral)",
                                        d: true,
                                        n: "Marcus"
                                    },
                                    { l: "J", c: "var(--lime)", n: "Jess" }
                                ].map((w, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: "6px 12px 6px 6px",
                                            borderRadius: 999,
                                            background: "var(--bg-sunken)"
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: "50%",
                                                background: w.c,
                                                color: w.d
                                                    ? "#fff"
                                                    : "var(--ink)",
                                                display: "grid",
                                                placeItems: "center",
                                                fontSize: 11,
                                                fontWeight: 700
                                            }}
                                        >
                                            {w.l}
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 500
                                            }}
                                        >
                                            {w.n}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ padding: "18px 0 8px" }}>
                            <div
                                className="eyebrow"
                                style={{ marginBottom: 10 }}
                            >
                                WEEK 19 · STARTS NOW
                            </div>
                            <div className="streak-row">
                                {[
                                    "today", "", "", "", "", "", ""
                                ].map((s, i) => (
                                    <div
                                        key={i}
                                        className={`streak-dot ${s === "today" ? "on today" : ""}`}
                                        style={{
                                            flex: 1,
                                            height: 28,
                                            borderRadius: 5
                                        }}
                                    />
                                ))}
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginTop: 8
                                }}
                            >
                                {["M", "T", "W", "T", "F", "S", "S"].map(
                                    (d, i) => (
                                        <span
                                            key={i}
                                            className="mono"
                                            style={{
                                                fontSize: 10,
                                                color:
                                                    i === 0
                                                        ? "var(--ink)"
                                                        : "var(--ink-3)",
                                                fontWeight:
                                                    i === 0 ? 600 : 400
                                            }}
                                        >
                                            {d}
                                        </span>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
