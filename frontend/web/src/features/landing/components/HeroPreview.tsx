// Hero preview card — a stylized phone screen showing today's goals.

import { SourceTile, type TileVariant } from "../../common/primitives"

export function HeroPreview() {
    const goals = [
        { src: "GH", tile: "ink", title: "Ship 5 commits", n: 3, goal: 5, unit: "/wk", tone: "lime" },
        { src: "LC", tile: "lime", title: "Solve 3 LeetCode", n: 1, goal: 3, unit: "/day", tone: "coral" },
        { src: "♥︎", tile: "coral", title: "Workout · Apple Health", n: 4, goal: 4, unit: "/wk", tone: "lime" },
        { src: "⏱", tile: "", title: "Screen Time under 2h", n: 1.4, goal: 2, unit: "h", tone: "lime" }
    ] as const

    return (
        <div style={{ position: "relative", width: 460, height: 560, perspective: 1400 }}>
            {/* Floating ribbon — friend cheer */}
            <div
                style={{
                    position: "absolute",
                    top: 28,
                    right: -34,
                    zIndex: 3,
                    background: "var(--ink)",
                    color: "var(--bg)",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 500,
                    boxShadow: "var(--shadow-lg)",
                    transform: "rotate(3deg)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10
                }}
            >
                <div
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "var(--coral)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        color: "#fff",
                        fontWeight: 600
                    }}
                >
                    M
                </div>
                <div>
                    <div style={{ fontWeight: 600 }}>Marcus is up 4 → 2</div>
                    <div style={{ opacity: 0.6, fontSize: 11 }}>
                        get on the leetcode lol
                    </div>
                </div>
            </div>

            {/* Streak callout */}
            <div
                style={{
                    position: "absolute",
                    bottom: 60,
                    left: -36,
                    zIndex: 3,
                    background: "var(--lime)",
                    color: "var(--ink)",
                    padding: "12px 16px",
                    borderRadius: 14,
                    boxShadow: "var(--shadow-lg)",
                    transform: "rotate(-4deg)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10
                }}
            >
                <div
                    className="mono"
                    style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}
                >
                    23
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.2 }}>
                    <div style={{ fontWeight: 600 }}>day streak</div>
                    <div>longest yet</div>
                </div>
            </div>

            {/* The phone */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--bg-card)",
                    borderRadius: 36,
                    boxShadow:
                        "var(--shadow-lg), inset 0 0 0 1px var(--line-2)",
                    padding: 28,
                    transform: "rotate(-2deg)"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 24
                    }}
                >
                    <div>
                        <div className="eyebrow" style={{ fontSize: 10 }}>
                            WED · MAY 14
                        </div>
                        <div
                            style={{
                                fontSize: 26,
                                fontWeight: 700,
                                letterSpacing: "-0.03em"
                            }}
                        >
                            Today
                        </div>
                    </div>
                    <div style={{ display: "flex" }}>
                        {["L", "M", "J"].map((l, i) => (
                            <div
                                key={l}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    background:
                                        i === 0
                                            ? "var(--lime)"
                                            : i === 1
                                              ? "var(--coral)"
                                              : "var(--ink)",
                                    color:
                                        i === 1
                                            ? "#fff"
                                            : i === 2
                                              ? "var(--bg)"
                                              : "var(--ink)",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    marginLeft: i === 0 ? 0 : -8,
                                    border: "2px solid var(--bg-card)"
                                }}
                            >
                                {l}
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10
                    }}
                >
                    {goals.map((g, i) => (
                        <div
                            key={i}
                            style={{
                                background: "var(--bg-sunken)",
                                borderRadius: 14,
                                padding: "12px 14px",
                                display: "flex",
                                alignItems: "center",
                                gap: 12
                            }}
                        >
                            <SourceTile
                                label={g.src}
                                variant={g.tile as TileVariant}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{ fontSize: 13, fontWeight: 600 }}
                                >
                                    {g.title}
                                </div>
                                <div
                                    className="bar"
                                    style={{
                                        height: 5,
                                        marginTop: 6,
                                        background: "rgba(0,0,0,0.06)"
                                    }}
                                >
                                    <i
                                        style={{
                                            width:
                                                Math.min(
                                                    100,
                                                    (g.n / g.goal) * 100
                                                ) + "%",
                                            background:
                                                g.tone === "coral"
                                                    ? "var(--coral)"
                                                    : "var(--lime)"
                                        }}
                                    />
                                </div>
                            </div>
                            <div
                                className="mono"
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "var(--ink-2)"
                                }}
                            >
                                {g.n}
                                <span style={{ color: "var(--ink-3)" }}>
                                    /{g.goal}
                                    {g.unit}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        marginTop: 24,
                        paddingTop: 16,
                        borderTop: "1px solid var(--line-2)"
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 10
                        }}
                    >
                        <span className="eyebrow" style={{ fontSize: 10 }}>
                            WEEK 19
                        </span>
                        <span
                            className="mono"
                            style={{ fontSize: 11, color: "var(--ink-3)" }}
                        >
                            14 / 20 pts
                        </span>
                    </div>
                    <div className="streak-row">
                        {["on", "on", "on", "today", "", "", ""].map((s, i) => (
                            <div
                                key={i}
                                className={`streak-dot ${s === "today" ? "on today" : s}`}
                                style={{ flex: 1, height: 22, borderRadius: 4 }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
