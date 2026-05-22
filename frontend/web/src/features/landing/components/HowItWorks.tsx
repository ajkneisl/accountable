// Landing section 02 — three-step explainer with inline preview cards.

import type { ReactNode } from "react"
import { SourceTile, type TileVariant } from "../../common/primitives"

export function HowItWorks() {
    const steps: { n: string; title: string; body: string; preview: ReactNode }[] =
        [
            {
                n: "01",
                title: "Set a goal",
                body: "Pick something specific and measurable. We help you scale it down until it’s attainable — not aspirational.",
                preview: (
                    <div
                        className="card"
                        style={{ padding: 18, fontSize: 13 }}
                    >
                        <div
                            className="eyebrow"
                            style={{ marginBottom: 8 }}
                        >
                            NEW GOAL
                        </div>
                        <input
                            value="Ship 5 commits to side projects"
                            readOnly
                            style={{
                                width: "100%",
                                border: 0,
                                outline: 0,
                                font: "inherit",
                                fontSize: 16,
                                fontWeight: 600,
                                background: "transparent",
                                padding: 0,
                                color: "var(--ink)"
                            }}
                        />
                        <div
                            style={{
                                display: "flex",
                                gap: 6,
                                marginTop: 12,
                                flexWrap: "wrap"
                            }}
                        >
                            <span
                                className="chip"
                                style={{
                                    background: "var(--lime-soft)",
                                    color: "var(--lime-ink)"
                                }}
                            >
                                <span className="dot-lime" /> per week
                            </span>
                            <span className="chip">Mon → Sun</span>
                            <span className="chip">3 friends watching</span>
                        </div>
                    </div>
                )
            },
            {
                n: "02",
                title: "Connect a source",
                body: "Authenticate with the apps that already track this. No self-reporting, no fudging the numbers.",
                preview: (
                    <div
                        className="card"
                        style={{ padding: 14, fontSize: 13 }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8
                            }}
                        >
                            {[
                                {
                                    l: "GitHub",
                                    s: "Connected · lkroon",
                                    g: "GH",
                                    on: true,
                                    v: "ink"
                                },
                                {
                                    l: "LeetCode",
                                    s: "Connected · 14 solved",
                                    g: "LC",
                                    on: true,
                                    v: "lime"
                                },
                                {
                                    l: "Apple Health",
                                    s: "Connect",
                                    g: "♥︎",
                                    on: false,
                                    v: "coral"
                                }
                            ].map((r, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10
                                    }}
                                >
                                    <SourceTile
                                        label={r.l}
                                        glyph={r.g}
                                        variant={r.v as TileVariant}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>
                                            {r.l}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: "var(--ink-3)"
                                            }}
                                        >
                                            {r.s}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            width: 30,
                                            height: 18,
                                            borderRadius: 999,
                                            background: r.on
                                                ? "var(--lime)"
                                                : "var(--line)",
                                            position: "relative",
                                            flexShrink: 0
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 2,
                                                left: r.on ? 14 : 2,
                                                width: 14,
                                                height: 14,
                                                borderRadius: "50%",
                                                background: "#fff",
                                                boxShadow:
                                                    "var(--shadow-sm)"
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            },
            {
                n: "03",
                title: "Bring friends",
                body: "Add 1 friend or a whole group. Stakes are optional. Public shame is included by default.",
                preview: (
                    <div className="card" style={{ padding: 14 }}>
                        <div
                            className="eyebrow"
                            style={{ marginBottom: 10 }}
                        >
                            SQUAD · DEEP WORK
                        </div>
                        {[
                            "You · 14pts",
                            "Marcus · 12pts",
                            "Jess · 11pts",
                            "Sam · 9pts"
                        ].map((p, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "7px 0",
                                    borderTop: i
                                        ? "1px solid var(--line-2)"
                                        : "none"
                                }}
                            >
                                <div
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: "50%",
                                        background: [
                                            "var(--lime)",
                                            "var(--coral)",
                                            "var(--ink)",
                                            "var(--bg-sunken)"
                                        ][i],
                                        color:
                                            i === 1
                                                ? "#fff"
                                                : i === 2
                                                  ? "var(--bg)"
                                                  : "var(--ink)",
                                        display: "grid",
                                        placeItems: "center",
                                        fontSize: 11,
                                        fontWeight: 600
                                    }}
                                >
                                    {p[0]}
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        fontSize: 13,
                                        fontWeight: 500
                                    }}
                                >
                                    {p}
                                </div>
                                {i === 0 && (
                                    <span
                                        className="chip"
                                        style={{
                                            background: "var(--lime)",
                                            color: "var(--ink)"
                                        }}
                                    >
                                        leader
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )
            }
        ]

    return (
        <section id="how-it-works" style={{ padding: "0 64px 96px" }}>
            <div style={{ marginBottom: 40 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                    02 · HOW IT WORKS
                </div>
                <h2
                    className="display"
                    style={{ fontSize: 48, margin: 0, maxWidth: 760 }}
                >
                    Three steps. Then you’re just keeping a promise — out loud.
                </h2>
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 28
                }}
            >
                {steps.map((s, i) => (
                    <div key={i}>
                        <div
                            className="mono"
                            style={{
                                fontSize: 13,
                                color: "var(--ink-3)",
                                marginBottom: 14
                            }}
                        >
                            {s.n}
                        </div>
                        <h3
                            style={{
                                fontSize: 24,
                                margin: "0 0 8px",
                                letterSpacing: "-0.02em"
                            }}
                        >
                            {s.title}
                        </h3>
                        <p
                            style={{
                                margin: "0 0 18px",
                                color: "var(--ink-2)",
                                fontSize: 15,
                                lineHeight: 1.5
                            }}
                        >
                            {s.body}
                        </p>
                        {s.preview}
                    </div>
                ))}
            </div>
        </section>
    )
}
