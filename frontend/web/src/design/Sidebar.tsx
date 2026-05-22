// App shell sidebar — shared by Dashboard and Competition.

import { Link } from "react-router-dom"
import { AccLogo, SourceTile, type TileVariant } from "./primitives"

type Goal = {
    tile: TileVariant
    g: string
    name: string
    sub: string
    warn?: boolean
    done?: boolean
}

type Squad = { c: string; n: string; d: string; to?: string }

const GOALS: Goal[] = [
    { tile: "ink", g: "GH", name: "Ship 5 commits", sub: "3 / 5 · this week" },
    { tile: "lime", g: "LC", name: "LeetCode daily", sub: "1 / 3 · today", warn: true },
    { tile: "coral", g: "♥︎", name: "Workouts", sub: "4 / 4 · done ✓", done: true },
    { tile: "", g: "⏱", name: "Screen Time", sub: "1.4 / 2h · today" }
]

const SQUADS: Squad[] = [
    { c: "var(--lime)", n: "Deep Work", d: "4 friends · live week" },
    { c: "var(--coral)", n: "Sat Soreness Club", d: "6 friends" },
    {
        c: "var(--ink)",
        n: "You vs Marcus",
        d: "head-to-head · 4d left",
        to: "/competition"
    }
]

export function Sidebar({ onSignOut }: { onSignOut?: () => void }) {
    return (
        <aside
            style={{
                width: 280,
                borderRight: "1px solid var(--line-2)",
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 28,
                background: "var(--bg)"
            }}
        >
            <Link
                to="/dashboard"
                style={{ textDecoration: "none", color: "inherit" }}
            >
                <AccLogo size={16} />
            </Link>

            <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>
                    MY GOALS
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4
                    }}
                >
                    {GOALS.map((g, i) => (
                        <div
                            key={i}
                            style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                background:
                                    i === 0 ? "var(--bg-sunken)" : "transparent",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                cursor: "pointer"
                            }}
                        >
                            <SourceTile label={g.g} variant={g.tile} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{ fontSize: 13, fontWeight: 600 }}
                                >
                                    {g.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: g.warn
                                            ? "var(--coral-ink)"
                                            : g.done
                                              ? "var(--lime-ink)"
                                              : "var(--ink-3)"
                                    }}
                                >
                                    {g.sub}
                                </div>
                            </div>
                        </div>
                    ))}
                    <Link
                        to="/onboarding"
                        className="btn btn-line btn-sm"
                        style={{ marginTop: 6, justifyContent: "flex-start" }}
                    >
                        + New goal
                    </Link>
                </div>
            </div>

            <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>
                    SQUADS
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4
                    }}
                >
                    {SQUADS.map((s, i) => {
                        const inner = (
                            <>
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: s.c
                                    }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 500
                                        }}
                                    >
                                        {s.n}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "var(--ink-3)"
                                        }}
                                    >
                                        {s.d}
                                    </div>
                                </div>
                            </>
                        )
                        const style: React.CSSProperties = {
                            padding: "8px 10px",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            cursor: "pointer",
                            color: "inherit",
                            textDecoration: "none"
                        }
                        return s.to ? (
                            <Link key={i} to={s.to} style={style}>
                                {inner}
                            </Link>
                        ) : (
                            <div key={i} style={style}>
                                {inner}
                            </div>
                        )
                    })}
                </div>
            </div>

            <button
                type="button"
                onClick={onSignOut}
                title={onSignOut ? "Sign out" : undefined}
                style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    background: "var(--bg-sunken)",
                    borderRadius: 12,
                    border: "none",
                    width: "100%",
                    font: "inherit",
                    textAlign: "left",
                    cursor: onSignOut ? "pointer" : "default"
                }}
            >
                <div
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "var(--lime)",
                        color: "var(--ink)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 600,
                        fontSize: 13
                    }}
                >
                    L
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Lukas Kroon
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                        lukas · streak 23d
                    </div>
                </div>
                <span style={{ color: "var(--ink-3)", fontSize: 12 }}>⌄</span>
            </button>
        </aside>
    )
}
