// Dashboard — logged-in view: today's progress + goals + activity. Ported from the design bundle.

import { Link } from "react-router-dom"
import { Sidebar } from "../design/Sidebar"
import { SourceTile, type TileVariant } from "../design/primitives"
import { useSignOut } from "../auth"

function Stat({
    label,
    value,
    sub,
    tone
}: {
    label: string
    value: string
    sub: string
    tone?: "lime" | "coral"
}) {
    return (
        <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
                {label}
            </div>
            <div
                className="mono tab"
                style={{
                    fontSize: 44,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    color:
                        tone === "lime"
                            ? "var(--lime-ink)"
                            : tone === "coral"
                              ? "var(--coral-ink)"
                              : "var(--ink)"
                }}
            >
                {value}
            </div>
            <div
                style={{
                    fontSize: 12,
                    color: "var(--ink-3)",
                    marginTop: 6
                }}
            >
                {sub}
            </div>
        </div>
    )
}

function RingChart({
    pct,
    label,
    tone = "lime"
}: {
    pct: number
    label: string
    tone?: "lime" | "coral" | "ink"
}) {
    const R = 56
    const C = 2 * Math.PI * R
    const stroke =
        tone === "lime"
            ? "var(--lime)"
            : tone === "coral"
              ? "var(--coral)"
              : "var(--ink)"
    return (
        <div style={{ position: "relative", width: 140, height: 140 }}>
            <svg width="140" height="140">
                <circle
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke="var(--line-2)"
                    strokeWidth="14"
                />
                <circle
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * C} ${C}`}
                    transform="rotate(-90 70 70)"
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <div
                    className="mono"
                    style={{
                        fontSize: 30,
                        fontWeight: 700,
                        letterSpacing: "-0.03em",
                        lineHeight: 1
                    }}
                >
                    {pct}
                    <span style={{ fontSize: 14, color: "var(--ink-3)" }}>
                        %
                    </span>
                </div>
                <div
                    style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        marginTop: 4
                    }}
                >
                    {label}
                </div>
            </div>
        </div>
    )
}

function WeekChart({
    vals,
    target,
    tone = "ink"
}: {
    vals: number[]
    target: number
    tone?: TileVariant
}) {
    const days = ["M", "T", "W", "T", "F", "S", "S"]
    const max = Math.max(target, ...vals) * 1.2
    const color =
        tone === "lime"
            ? "var(--lime)"
            : tone === "coral"
              ? "var(--coral)"
              : "var(--ink)"
    return (
        <div>
            <div
                style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 6,
                    height: 80
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: (target / max) * 80,
                        height: 0,
                        borderTop: "1px dashed var(--ink-3)",
                        opacity: 0.5
                    }}
                />
                {vals.map((v, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4
                        }}
                    >
                        <div
                            style={{
                                width: "100%",
                                height: (v / max) * 80,
                                minHeight: v === 0 ? 0 : 4,
                                background:
                                    v >= target ? color : "var(--line)",
                                borderRadius: 3,
                                transition: "height .3s"
                            }}
                        />
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {days.map((d, i) => (
                    <div
                        key={i}
                        className="mono"
                        style={{
                            flex: 1,
                            textAlign: "center",
                            fontSize: 10,
                            color: "var(--ink-3)"
                        }}
                    >
                        {d}
                    </div>
                ))}
            </div>
        </div>
    )
}

type Watcher = { l: string; c: string; dark?: boolean }

type GoalData = {
    g: string
    tile: TileVariant
    name: string
    source: string
    n: number
    target: number
    unit: string
    tone: TileVariant
    vals: number[]
    dailyTarget: number
    delta: string
    deltaPos: boolean
    streak: number
    watchers: Watcher[]
    watchersLabel: string
}

function GoalCard({ goal }: { goal: GoalData }) {
    return (
        <div
            className="card"
            style={{
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                minHeight: 280
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center"
                    }}
                >
                    <SourceTile label={goal.g} variant={goal.tile} />
                    <div>
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                letterSpacing: "-0.01em"
                            }}
                        >
                            {goal.name}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--ink-3)"
                            }}
                        >
                            {goal.source}
                        </div>
                    </div>
                </div>
                <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 6 }}
                >
                    ⋯
                </button>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 14
                }}
            >
                <div
                    className="mono"
                    style={{
                        fontSize: 44,
                        fontWeight: 700,
                        letterSpacing: "-0.03em",
                        lineHeight: 1
                    }}
                >
                    {goal.n}
                </div>
                <div
                    style={{
                        fontSize: 13,
                        color: "var(--ink-3)",
                        marginBottom: 6
                    }}
                >
                    / {goal.target} {goal.unit}
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div
                        className="mono"
                        style={{
                            fontSize: 14,
                            color: goal.deltaPos
                                ? "var(--lime-ink)"
                                : "var(--coral-ink)",
                            fontWeight: 600
                        }}
                    >
                        {goal.deltaPos ? "↑" : "↓"} {goal.delta}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                        vs last wk
                    </div>
                </div>
            </div>

            <WeekChart
                vals={goal.vals}
                target={goal.dailyTarget}
                tone={goal.tone}
            />

            <div
                style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingTop: 10,
                    borderTop: "1px solid var(--line-2)"
                }}
            >
                <div style={{ display: "flex" }}>
                    {goal.watchers.map((w, i) => (
                        <div
                            key={i}
                            style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: w.c,
                                color: w.dark ? "#fff" : "var(--ink)",
                                marginLeft: i ? -6 : 0,
                                border: "2px solid var(--bg-card)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 9,
                                fontWeight: 700
                            }}
                        >
                            {w.l}
                        </div>
                    ))}
                </div>
                <div
                    style={{
                        fontSize: 12,
                        color: "var(--ink-3)",
                        flex: 1
                    }}
                >
                    {goal.watchersLabel}
                </div>
                <div
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-3)" }}
                >
                    🔥 {goal.streak}d
                </div>
            </div>
        </div>
    )
}

type Activity = {
    user: string
    userColor: string
    userDark?: boolean
    action: string
    detail: string
    time: string
}

function ActivityRow({ a }: { a: Activity }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderTop: "1px solid var(--line-2)"
            }}
        >
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: a.userColor,
                    color: a.userDark ? "#fff" : "var(--ink)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0
                }}
            >
                {a.user[0]}
            </div>
            <div style={{ flex: 1, fontSize: 13 }}>
                <b>{a.user}</b>{" "}
                <span style={{ color: "var(--ink-2)" }}>{a.action}</span>{" "}
                <span style={{ color: "var(--ink-3)" }}>{a.detail}</span>
            </div>
            <div
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)" }}
            >
                {a.time}
            </div>
        </div>
    )
}

const GOALS: GoalData[] = [
    {
        g: "GH",
        tile: "ink",
        name: "Ship 5 commits / week",
        source: "GitHub · lkroon",
        n: 3,
        target: 5,
        unit: "commits",
        tone: "ink",
        vals: [1, 0, 2, 0, 0, 0, 0],
        dailyTarget: 1,
        delta: "+2",
        deltaPos: true,
        streak: 6,
        watchers: [
            { l: "M", c: "var(--coral)", dark: true },
            { l: "J", c: "var(--lime)" },
            { l: "S", c: "var(--ink)", dark: true }
        ],
        watchersLabel: "Marcus, Jess, Sam watching"
    },
    {
        g: "LC",
        tile: "lime",
        name: "Solve 3 LeetCode / day",
        source: "LeetCode · lukas-k",
        n: 1,
        target: 3,
        unit: "today",
        tone: "coral",
        vals: [3, 3, 4, 3, 2, 1, 0],
        dailyTarget: 3,
        delta: "−4",
        deltaPos: false,
        streak: 0,
        watchers: [{ l: "M", c: "var(--coral)", dark: true }],
        watchersLabel: "Marcus is checking"
    },
    {
        g: "♥︎",
        tile: "coral",
        name: "4 workouts / week",
        source: "Apple Health",
        n: 4,
        target: 4,
        unit: "workouts",
        tone: "lime",
        vals: [1, 0, 1, 0, 1, 1, 0],
        dailyTarget: 0.5,
        delta: "+1",
        deltaPos: true,
        streak: 12,
        watchers: [
            { l: "J", c: "var(--lime)" },
            { l: "A", c: "var(--ink)", dark: true }
        ],
        watchersLabel: "Sat Soreness Club"
    },
    {
        g: "⏱",
        tile: "",
        name: "Screen Time under 2h",
        source: "Apple Screen Time · Instagram",
        n: 1.4,
        target: 2,
        unit: "hours today",
        tone: "lime",
        vals: [1.8, 2.4, 1.1, 0.9, 1.6, 1.2, 1.4],
        dailyTarget: 2,
        delta: "−18m",
        deltaPos: true,
        streak: 4,
        watchers: [
            { l: "J", c: "var(--lime)" },
            { l: "P", c: "var(--coral)", dark: true },
            { l: "A", c: "var(--ink)", dark: true }
        ],
        watchersLabel: "6 of us trying not to scroll"
    }
]

const ACTIVITY: Activity[] = [
    { user: "Marcus", userColor: "var(--coral)", userDark: true, action: "closed", detail: '"LeetCode #347 — Top K Elements"', time: "2m" },
    { user: "Jess", userColor: "var(--lime)", action: "logged a workout", detail: "Apple Health · Run 5.2km", time: "47m" },
    { user: "You", userColor: "var(--ink)", userDark: true, action: "pushed 2 commits to", detail: "accountable-web", time: "1h" },
    { user: "Sam", userColor: "var(--bg-sunken)", action: "missed", detail: "Screen Time goal · 2h 41m on Instagram", time: "3h" },
    { user: "Marcus", userColor: "var(--coral)", userDark: true, action: "extended his streak →", detail: "14 days", time: "6h" },
    { user: "Jess", userColor: "var(--lime)", action: "cheered you on", detail: '"go go go you got this"', time: "9h" }
]

const STREAK_14 = [
    "on", "on", "miss", "on", "on", "on", "on", "on", "on", "miss", "on", "on", "on", "today"
]

export default function Dashboard() {
    const signOut = useSignOut()
    return (
        <div
            className="acc"
            style={{
                width: 1440,
                margin: "0 auto",
                minHeight: 1000,
                display: "flex"
            }}
        >
            <Sidebar onSignOut={signOut} />

            <main style={{ flex: 1, padding: "28px 36px" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 28
                    }}
                >
                    <div>
                        <div
                            className="eyebrow"
                            style={{ marginBottom: 8 }}
                        >
                            WED · MAY 14 · 6:42 PM
                        </div>
                        <h1
                            className="display"
                            style={{ fontSize: 40, margin: 0 }}
                        >
                            Hey Lukas.{" "}
                            <span style={{ color: "var(--ink-3)" }}>
                                3 of 4 goals on track.
                            </span>
                        </h1>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button className="btn btn-line btn-sm">
                            Add source
                        </button>
                        <Link
                            to="/onboarding"
                            className="btn btn-primary btn-sm"
                        >
                            + New goal
                        </Link>
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 16,
                        marginBottom: 28
                    }}
                >
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
                            <div
                                className="eyebrow"
                                style={{ marginBottom: 6 }}
                            >
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

                    <div className="card" style={{ padding: 24 }}>
                        <div
                            className="eyebrow"
                            style={{ marginBottom: 14 }}
                        >
                            STREAKS
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 18
                            }}
                        >
                            <Stat
                                label="LONGEST"
                                value="23d"
                                sub="commits · started Apr 21"
                                tone="lime"
                            />
                            <Stat
                                label="ACTIVE"
                                value="3"
                                sub="of 4 goals streaking"
                            />
                        </div>
                        <div
                            style={{
                                marginTop: 18,
                                paddingTop: 14,
                                borderTop: "1px solid var(--line-2)"
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 8,
                                    fontSize: 12,
                                    color: "var(--ink-3)"
                                }}
                            >
                                <span>last 14 days</span>
                                <span className="mono">11 / 14 perfect</span>
                            </div>
                            <div className="streak-row">
                                {STREAK_14.map((s, i) => (
                                    <div
                                        key={i}
                                        className={`streak-dot ${s === "today" ? "on today" : s}`}
                                        style={{
                                            flex: 1,
                                            height: 22,
                                            borderRadius: 4
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

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
                            <div
                                className="eyebrow"
                                style={{ color: "var(--lime)" }}
                            >
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
                            You vs Marcus · week 19. Loser buys coffee for a
                            week.
                        </div>
                        <Link
                            to="/competition"
                            className="btn btn-accent btn-sm"
                            style={{ width: "100%" }}
                        >
                            Open competition →
                        </Link>
                    </div>
                </div>

                <div
                    style={{
                        marginBottom: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}
                >
                    <div className="eyebrow">YOUR GOALS · WEEK 19</div>
                    <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ background: "var(--bg-sunken)" }}
                        >
                            Week
                        </button>
                        <button className="btn btn-ghost btn-sm">
                            Month
                        </button>
                        <button className="btn btn-ghost btn-sm">
                            All time
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 16
                    }}
                >
                    {GOALS.map((g, i) => (
                        <GoalCard key={i} goal={g} />
                    ))}
                </div>
            </main>

            <aside
                style={{
                    width: 320,
                    borderLeft: "1px solid var(--line-2)",
                    padding: "28px 24px",
                    background: "var(--bg)"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 18
                    }}
                >
                    <div className="eyebrow">ACTIVITY · LIVE</div>
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--lime)"
                        }}
                    />
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    {ACTIVITY.map((a, i) => (
                        <ActivityRow key={i} a={a} />
                    ))}
                </div>

                <div
                    style={{
                        marginTop: 28,
                        padding: 18,
                        background: "var(--bg-sunken)",
                        borderRadius: 14
                    }}
                >
                    <div className="eyebrow" style={{ marginBottom: 8 }}>
                        UP NEXT
                    </div>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 4
                        }}
                    >
                        Solve 2 more LeetCode
                    </div>
                    <div
                        style={{
                            fontSize: 12,
                            color: "var(--ink-3)",
                            marginBottom: 12
                        }}
                    >
                        To stay on today&#39;s plan. ~24 min based on your
                        average.
                    </div>
                    <button
                        className="btn btn-primary btn-sm"
                        style={{ width: "100%" }}
                    >
                        Open LeetCode →
                    </button>
                </div>

                <div
                    style={{
                        marginTop: 18,
                        padding: 18,
                        border: "1px dashed var(--line)",
                        borderRadius: 14
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8
                        }}
                    >
                        <div
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: "var(--coral)",
                                color: "#fff",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 11,
                                fontWeight: 600
                            }}
                        >
                            M
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                            Marcus nudged you
                        </div>
                    </div>
                    <div
                        style={{
                            fontSize: 13,
                            color: "var(--ink-2)",
                            marginBottom: 12
                        }}
                    >
                        “two leetcodes is like 20 minutes lol”
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <button
                            className="btn btn-line btn-sm"
                            style={{ flex: 1, padding: "6px 10px" }}
                        >
                            👍 ok ok
                        </button>
                        <button
                            className="btn btn-line btn-sm"
                            style={{ flex: 1, padding: "6px 10px" }}
                        >
                            Reply
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    )
}
