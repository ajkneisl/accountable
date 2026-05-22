// Landing — desktop marketing site (1440 wide). Ported from the design bundle.

import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { AccLogo, SourceTile, type TileVariant } from "../design/primitives"

// Hero preview card — a stylized phone screen showing today's goals
function HeroPreview() {
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

function NavBar() {
    return (
        <nav
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "24px 64px"
            }}
        >
            <AccLogo />
            <div
                style={{
                    display: "flex",
                    gap: 32,
                    alignItems: "center",
                    fontSize: 14
                }}
            >
                {["How it works", "Sources", "Goals", "Pricing"].map((l) => (
                    <a
                        key={l}
                        style={{
                            color: "var(--ink-2)",
                            textDecoration: "none",
                            cursor: "pointer"
                        }}
                    >
                        {l}
                    </a>
                ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Link to="/login" className="btn btn-ghost btn-sm">
                    Sign in
                </Link>
                <Link to="/onboarding" className="btn btn-primary btn-sm">
                    Start free
                </Link>
            </div>
        </nav>
    )
}

function Hero() {
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

function SourceMarquee() {
    const sources = [
        { label: "GitHub", glyph: "GH", kind: "commits / PRs" },
        { label: "LeetCode", glyph: "LC", kind: "problems" },
        { label: "Apple Health", glyph: "♥︎", kind: "workouts / steps" },
        { label: "Screen Time", glyph: "⏱", kind: "app limits" },
        { label: "Strava", glyph: "ST", kind: "rides / runs" },
        { label: "Duolingo", glyph: "DL", kind: "lessons" },
        { label: "Spotify", glyph: "SP", kind: "minutes" },
        { label: "Notion", glyph: "NT", kind: "pages written" },
        { label: "Sleep Cycle", glyph: "ZZ", kind: "hours slept" },
        { label: "Webcam", glyph: "📷", kind: "desk check-ins" }
    ]
    const variants: TileVariant[] = ["ink", "lime", "coral", "", ""]
    return (
        <section style={{ padding: "0 64px 96px" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 32
                }}
            >
                <div>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>
                        01 · SOURCES
                    </div>
                    <h2
                        className="display"
                        style={{ fontSize: 48, margin: 0, maxWidth: 720 }}
                    >
                        Wire up the apps you already use. We trust the data, not
                        the promises.
                    </h2>
                </div>
                <button className="btn btn-line">All 32 sources →</button>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 12
                }}
            >
                {sources.map((s, i) => (
                    <div
                        key={i}
                        className="card"
                        style={{
                            padding: 18,
                            display: "flex",
                            alignItems: "center",
                            gap: 14
                        }}
                    >
                        <SourceTile
                            label={s.label}
                            glyph={s.glyph}
                            variant={variants[i % 5]}
                        />
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600 }}>
                                {s.label}
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "var(--ink-3)"
                                }}
                            >
                                {s.kind}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

function HowItWorks() {
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
        <section style={{ padding: "0 64px 96px" }}>
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

function GoalsShowcase() {
    const goals = [
        { src: "GH", tile: "ink", title: "Ship 5 commits / week", who: "3 of us. 2 weeks running.", pct: 60 },
        { src: "LC", tile: "lime", title: "Solve 3 LeetCode / day", who: "Just me, but Marcus is checking.", pct: 33 },
        { src: "♥︎", tile: "coral", title: "4 workouts / week", who: "The Saturday Soreness Club", pct: 100 },
        { src: "⏱", tile: "", title: "Under 2h on Instagram / day", who: "6 of us trying not to scroll.", pct: 70 }
    ] as const
    return (
        <section style={{ padding: "0 64px 96px" }}>
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

function CompetitionTease() {
    return (
        <section style={{ padding: "0 64px 96px" }}>
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

function CTA() {
    return (
        <section style={{ padding: "40px 64px 80px" }}>
            <div
                style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}
            >
                <h2
                    className="display"
                    style={{ fontSize: 72, margin: "0 0 20px" }}
                >
                    The goal is small.
                    <br />
                    The friends are the trick.
                </h2>
                <p
                    style={{
                        fontSize: 18,
                        color: "var(--ink-2)",
                        marginBottom: 28
                    }}
                >
                    Free to start. No credit card. Bring one friend; the second
                    is on us.
                </p>
                <div
                    style={{
                        display: "inline-flex",
                        gap: 8,
                        alignItems: "center",
                        padding: 6,
                        paddingLeft: 18,
                        borderRadius: 999,
                        background: "var(--bg-card)",
                        border: "1px solid var(--line)"
                    }}
                >
                    <input
                        placeholder="you@inbox.com"
                        style={{
                            border: 0,
                            outline: 0,
                            font: "inherit",
                            fontSize: 15,
                            background: "transparent",
                            width: 220
                        }}
                    />
                    <Link to="/onboarding" className="btn btn-primary">
                        Get my first goal →
                    </Link>
                </div>
            </div>
        </section>
    )
}

function Footer() {
    return (
        <footer
            style={{
                padding: "40px 64px 56px",
                borderTop: "1px solid var(--line-2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                color: "var(--ink-3)",
                fontSize: 13
            }}
        >
            <div>
                <AccLogo />
                <div style={{ marginTop: 12 }}>
                    © 2026 · Built by three friends who kept missing the gym.
                </div>
            </div>
            <div style={{ display: "flex", gap: 40 }}>
                <div>
                    <div className="eyebrow" style={{ marginBottom: 10 }}>
                        Product
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6
                        }}
                    >
                        {["Sources", "Competitions", "Squads"].map((l) => (
                            <a
                                key={l}
                                style={{
                                    color: "inherit",
                                    textDecoration: "none",
                                    cursor: "pointer"
                                }}
                            >
                                {l}
                            </a>
                        ))}
                    </div>
                </div>
                <div>
                    <div className="eyebrow" style={{ marginBottom: 10 }}>
                        Company
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6
                        }}
                    >
                        {["About", "Manifesto", "Privacy"].map((l) => (
                            <a
                                key={l}
                                style={{
                                    color: "inherit",
                                    textDecoration: "none",
                                    cursor: "pointer"
                                }}
                            >
                                {l}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default function Landing() {
    return (
        <div className="acc" style={{ width: 1440, margin: "0 auto" }}>
            <NavBar />
            <Hero />
            <SourceMarquee />
            <HowItWorks />
            <GoalsShowcase />
            <CompetitionTease />
            <CTA />
            <Footer />
        </div>
    )
}
