// Landing section 03 — showcase of attainable goal cards.

import { SourceTile, type TileVariant } from "../../common/primitives"

export function GoalsShowcase() {
    const goals = [
        { src: "GH", tile: "ink", title: "Ship 5 commits / week", who: "3 of us. 2 weeks running.", pct: 60 },
        { src: "LC", tile: "lime", title: "Solve 3 LeetCode / day", who: "Just me, but Marcus is checking.", pct: 33 },
        { src: "♥︎", tile: "coral", title: "4 workouts / week", who: "The Saturday Soreness Club", pct: 100 },
        { src: "⏱", tile: "", title: "Under 2h on Instagram / day", who: "6 of us trying not to scroll.", pct: 70 }
    ] as const
    return (
        <section id="goals" style={{ padding: "0 64px 96px" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    marginBottom: 32
                }}
            >
                <div>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>
                        03 · GOALS PEOPLE ACTUALLY KEEP
                    </div>
                    <h2
                        className="display"
                        style={{ fontSize: 48, margin: 0, maxWidth: 760 }}
                    >
                        Boring, attainable, repeatable. The kind that compound.
                    </h2>
                </div>
                <div
                    style={{
                        maxWidth: 320,
                        color: "var(--ink-2)",
                        fontSize: 14
                    }}
                >
                    We&#39;ll talk you out of <i>“get jacked”</i> and into{" "}
                    <i>
                        “four workouts a week, measured by Apple Health”
                    </i>
                    . The first goal is half the work.
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 16
                }}
            >
                {goals.map((g, i) => (
                    <div
                        key={i}
                        className="card"
                        style={{
                            padding: 22,
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                            minHeight: 200
                        }}
                    >
                        <SourceTile
                            label={g.src}
                            variant={g.tile as TileVariant}
                        />
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: 18,
                                    fontWeight: 600,
                                    letterSpacing: "-0.01em",
                                    marginBottom: 8
                                }}
                            >
                                {g.title}
                            </div>
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "var(--ink-3)"
                                }}
                            >
                                {g.who}
                            </div>
                        </div>
                        <div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 6,
                                    fontSize: 12
                                }}
                            >
                                <span style={{ color: "var(--ink-3)" }}>
                                    this week
                                </span>
                                <span
                                    className="mono"
                                    style={{
                                        color: "var(--ink-2)",
                                        fontWeight: 600
                                    }}
                                >
                                    {g.pct}%
                                </span>
                            </div>
                            <div className="bar" style={{ height: 6 }}>
                                <i
                                    style={{
                                        width: g.pct + "%",
                                        background:
                                            g.pct === 100
                                                ? "var(--lime)"
                                                : g.pct < 40
                                                  ? "var(--coral)"
                                                  : "var(--ink)"
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
