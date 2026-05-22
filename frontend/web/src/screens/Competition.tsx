// Competition — "You vs Marcus" head-to-head week. Ported from the design bundle.

import { Sidebar } from "../design/Sidebar"
import { SourceTile, type TileVariant } from "../design/primitives"
import { useSignOut } from "../auth"

type Cat = {
    glyph: string
    tile: TileVariant
    label: string
    source: string
    won: number
    lost: number
    leader: "you" | "marcus" | "tie"
}

function ScoreDelta({ won, lost, label, source, glyph, tile, leader }: Cat) {
    const total = won + lost
    const wpct = total ? (won / total) * 100 : 50
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 0",
                borderTop: "1px solid var(--line-2)"
            }}
        >
            <SourceTile label={glyph} variant={tile} />
            <div style={{ width: 160 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {source}
                </div>
            </div>
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                }}
            >
                <div
                    className="mono tab"
                    style={{
                        width: 32,
                        textAlign: "right",
                        fontWeight: leader === "you" ? 700 : 500,
                        color:
                            leader === "you"
                                ? "var(--lime-ink)"
                                : "var(--ink-3)"
                    }}
                >
                    {won}
                </div>
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        height: 10,
                        borderRadius: 5,
                        overflow: "hidden",
                        background: "var(--line-2)"
                    }}
                >
                    <div
                        style={{
                            width: wpct + "%",
                            height: "100%",
                            background: "var(--lime)"
                        }}
                    />
                    <div
                        style={{
                            width: 100 - wpct + "%",
                            height: "100%",
                            background: "var(--coral)"
                        }}
                    />
                </div>
                <div
                    className="mono tab"
                    style={{
                        width: 32,
                        textAlign: "left",
                        fontWeight: leader === "marcus" ? 700 : 500,
                        color:
                            leader === "marcus"
                                ? "var(--coral-ink)"
                                : "var(--ink-3)"
                    }}
                >
                    {lost}
                </div>
            </div>
            <div style={{ width: 80, textAlign: "right" }}>
                {leader === "you" && (
                    <span
                        className="chip"
                        style={{
                            background: "var(--lime-soft)",
                            color: "var(--lime-ink)"
                        }}
                    >
                        <span className="dot-lime" /> +{won - lost}
                    </span>
                )}
                {leader === "marcus" && (
                    <span
                        className="chip"
                        style={{
                            background: "var(--coral-soft)",
                            color: "var(--coral-ink)"
                        }}
                    >
                        <span className="dot-coral" /> +{lost - won}
                    </span>
                )}
                {leader === "tie" && <span className="chip">tied</span>}
            </div>
        </div>
    )
}

function DailyScoreChart({ you, marcus }: { you: number[]; marcus: number[] }) {
    const W = 720
    const H = 200
    const P = 28
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const max = Math.max(...you, ...marcus, 5) + 2
    const xs = (i: number) => P + (i / (days.length - 1)) * (W - P * 2)
    const ys = (v: number) => H - P - (v / max) * (H - P * 2)
    const path = (vals: number[]) =>
        vals
            .map(
                (v, i) =>
                    (i ? "L" : "M") + xs(i).toFixed(1) + " " + ys(v).toFixed(1)
            )
            .join(" ")
    const today = 2 // wed

    return (
        <div style={{ position: "relative" }}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                height={H}
                style={{ display: "block", overflow: "visible" }}
            >
                {[0, max / 2, max].map((v, i) => (
                    <g key={i}>
                        <line
                            x1={P}
                            y1={ys(v)}
                            x2={W - P}
                            y2={ys(v)}
                            stroke="var(--line-2)"
                        />
                        <text
                            x={W - P + 6}
                            y={ys(v) + 4}
                            fontSize="10"
                            fill="var(--ink-3)"
                            fontFamily="Geist Mono"
                        >
                            {Math.round(v)}
                        </text>
                    </g>
                ))}

                <line
                    x1={xs(today)}
                    y1={P / 2}
                    x2={xs(today)}
                    y2={H - P}
                    stroke="var(--ink)"
                    strokeDasharray="3 4"
                    opacity="0.3"
                />

                <path
                    d={
                        path(marcus) +
                        ` L${xs(days.length - 1)} ${ys(0)} L${xs(0)} ${ys(0)} Z`
                    }
                    fill="var(--coral)"
                    opacity="0.08"
                />
                <path
                    d={
                        path(you) +
                        ` L${xs(days.length - 1)} ${ys(0)} L${xs(0)} ${ys(0)} Z`
                    }
                    fill="var(--lime)"
                    opacity="0.16"
                />

                <path
                    d={path(marcus)}
                    stroke="var(--coral)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d={path(you)}
                    stroke="var(--lime-ink)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {you.map((v, i) =>
                    i <= today ? (
                        <circle
                            key={"y" + i}
                            cx={xs(i)}
                            cy={ys(v)}
                            r={i === today ? 6 : 4}
                            fill="var(--lime)"
                            stroke="var(--bg)"
                            strokeWidth="2"
                        />
                    ) : null
                )}
                {marcus.map((v, i) =>
                    i <= today ? (
                        <circle
                            key={"m" + i}
                            cx={xs(i)}
                            cy={ys(v)}
                            r={i === today ? 6 : 4}
                            fill="var(--coral)"
                            stroke="var(--bg)"
                            strokeWidth="2"
                        />
                    ) : null
                )}

                {days.map((d, i) => (
                    <text
                        key={d}
                        x={xs(i)}
                        y={H - 6}
                        fontSize="10"
                        fill={i === today ? "var(--ink)" : "var(--ink-3)"}
                        textAnchor="middle"
                        fontFamily="Geist Mono"
                        fontWeight={i === today ? 600 : 400}
                    >
                        {d}
                    </text>
                ))}

                <g transform={`translate(${xs(today)}, ${P / 2})`}>
                    <rect
                        x="-22"
                        y="-14"
                        width="44"
                        height="18"
                        rx="9"
                        fill="var(--ink)"
                    />
                    <text
                        x="0"
                        y="-1"
                        textAnchor="middle"
                        fontSize="10"
                        fill="var(--bg)"
                        fontFamily="Geist Mono"
                        fontWeight="600"
                    >
                        TODAY
                    </text>
                </g>
            </svg>
        </div>
    )
}

function CompFighter({
    side,
    name,
    glyph,
    color,
    dark,
    score,
    streak,
    big,
    vals,
    won,
    marker
}: {
    side: "left" | "right"
    name: string
    glyph: string
    color: string
    dark?: boolean
    score: number
    streak: string
    big?: boolean
    vals: string
    won?: boolean
    marker: string
}) {
    return (
        <div
            style={{
                flex: 1,
                textAlign: side === "left" ? "left" : "right",
                display: "flex",
                flexDirection: "column",
                gap: 10
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexDirection: side === "left" ? "row" : "row-reverse"
                }}
            >
                <div style={{ position: "relative" }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: "50%",
                            background: color,
                            color: dark ? "#fff" : "var(--ink)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 26,
                            fontWeight: 700
                        }}
                    >
                        {glyph}
                    </div>
                    {won && (
                        <div
                            style={{
                                position: "absolute",
                                top: -6,
                                right: -6,
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: "var(--lime)",
                                color: "var(--ink)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 12,
                                fontWeight: 700
                            }}
                        >
                            ★
                        </div>
                    )}
                </div>
                <div
                    style={{
                        textAlign: side === "left" ? "left" : "right"
                    }}
                >
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            letterSpacing: "-0.02em"
                        }}
                    >
                        {name}
                    </div>
                    <div
                        className="mono"
                        style={{ fontSize: 12, color: "var(--ink-3)" }}
                    >
                        {marker}
                    </div>
                </div>
            </div>
            <div
                className="mono tab"
                style={{
                    fontSize: 96,
                    fontWeight: 700,
                    letterSpacing: "-0.05em",
                    lineHeight: 0.9,
                    color: big ? "var(--ink)" : "var(--ink-3)"
                }}
            >
                {score}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                streak {streak} · {vals} pts/day avg
            </div>
        </div>
    )
}

type FeedEvent = {
    time: string
    who: "you" | "marcus"
    text: string
    pts: number
}

function HourBar({ event }: { event: FeedEvent }) {
    const tone = event.who === "you" ? "var(--lime)" : "var(--coral)"
    const tonebg =
        event.who === "you" ? "var(--lime-soft)" : "var(--coral-soft)"
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: tonebg
            }}
        >
            <div
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)", width: 46 }}
            >
                {event.time}
            </div>
            <div
                style={{
                    width: 4,
                    alignSelf: "stretch",
                    background: tone,
                    borderRadius: 2
                }}
            />
            <div style={{ flex: 1, fontSize: 13 }}>
                <b>{event.who === "you" ? "You" : "Marcus"}</b>{" "}
                <span style={{ color: "var(--ink-2)" }}>{event.text}</span>
            </div>
            <div
                className="mono"
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color:
                        tone === "var(--lime)"
                            ? "var(--lime-ink)"
                            : "var(--coral-ink)"
                }}
            >
                +{event.pts}
            </div>
        </div>
    )
}

const CATS: Cat[] = [
    { glyph: "GH", tile: "ink", label: "Commits", source: "GitHub", won: 8, lost: 5, leader: "you" },
    { glyph: "LC", tile: "lime", label: "LeetCode", source: "Daily", won: 2, lost: 6, leader: "marcus" },
    { glyph: "♥︎", tile: "coral", label: "Workouts", source: "Apple Health", won: 3, lost: 0, leader: "you" },
    { glyph: "⏱", tile: "", label: "Screen Time", source: "Under 2h/day", won: 1, lost: 0, leader: "tie" }
]

const YOU_DAILY = [3, 4, 7, 0, 0, 0, 0]
const MAR_DAILY = [2, 3, 6, 0, 0, 0, 0]

const FEED: FeedEvent[] = [
    { time: "6:42p", who: "you", text: "closed LeetCode #347 — Top K Frequent", pts: 1 },
    { time: "5:11p", who: "marcus", text: "closed LeetCode #146 — LRU Cache", pts: 1 },
    { time: "2:08p", who: "you", text: "pushed 2 commits to accountable-web", pts: 2 },
    { time: "12:30p", who: "marcus", text: "logged a workout · 32min lift", pts: 1 },
    { time: "11:14a", who: "you", text: "logged a workout · Run 5.2km", pts: 1 },
    { time: "9:02a", who: "marcus", text: "pushed 1 commit to slimd", pts: 1 }
]

type TrashMsg = {
    who: string
    name: string
    body: string
    time: string
    color: string
    dark?: boolean
    mine?: boolean
}

const TRASH: TrashMsg[] = [
    { who: "M", name: "Marcus", body: "you got lucky on the run today. just wait until friday", time: "4:21p", color: "var(--coral)", dark: true },
    { who: "L", name: "You", body: "staying ahead is the easy part. catching up is the hard part 😎", time: "4:38p", color: "var(--lime)", dark: false, mine: true },
    { who: "M", name: "Marcus", body: "tomorrow is leetcode day i WILL close that gap", time: "5:02p", color: "var(--coral)", dark: true },
    { who: "J", name: "Jess", body: "i love how unhinged you both are about this btw", time: "5:14p", color: "var(--lime)" }
]

const STAKES = [
    { l: "STAKES", v: "Loser ☕ × 1 wk", sub: "agreed on Sun" },
    { l: "POINTS", v: "1 / source / day", sub: "caps at 2/day per src" },
    { l: "JUDGE", v: "Auto + Jess", sub: "ties go to Jess" },
    { l: "LAST MEET", v: "You won 18 — 16", sub: "week 18 · streak: 2" }
]

export default function Competition() {
    const signOut = useSignOut()
    return (
        <div
            className="acc"
            style={{
                width: 1440,
                margin: "0 auto",
                minHeight: 1100,
                display: "flex"
            }}
        >
            <Sidebar onSignOut={signOut} />

            <main style={{ flex: 1, padding: "28px 36px" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 24
                    }}
                >
                    <div>
                        <div
                            className="eyebrow"
                            style={{ marginBottom: 8 }}
                        >
                            HEAD-TO-HEAD · WEEK 19 · MAY 12 — 18
                        </div>
                        <h1
                            className="display"
                            style={{ fontSize: 44, margin: 0 }}
                        >
                            You vs Marcus
                        </h1>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center"
                        }}
                    >
                        <span
                            className="chip"
                            style={{
                                background: "var(--bg-card)",
                                border: "1px solid var(--line-2)"
                            }}
                        >
                            <span className="dot-lime" /> live · 4d 5h 18m left
                        </span>
                        <button className="btn btn-line btn-sm">
                            Invite onlooker
                        </button>
                        <button className="btn btn-primary btn-sm">
                            Trash talk
                        </button>
                    </div>
                </div>

                <div
                    className="card"
                    style={{
                        background: "var(--ink)",
                        color: "var(--bg)",
                        border: "none",
                        padding: "36px 40px",
                        marginBottom: 18,
                        position: "relative",
                        overflow: "hidden"
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage:
                                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
                            backgroundSize: "100% 32px",
                            pointerEvents: "none"
                        }}
                    />

                    <div
                        style={{
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            gap: 40
                        }}
                    >
                        <CompFighter
                            side="left"
                            name="Lukas"
                            glyph="L"
                            color="var(--lime)"
                            dark={false}
                            score={14}
                            streak="6d"
                            vals="4.7"
                            big
                            won
                            marker="@lukas-k"
                        />
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 6
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    opacity: 0.5,
                                    fontFamily: "Geist Mono",
                                    letterSpacing: "0.1em"
                                }}
                            >
                                VS
                            </div>
                            <div
                                className="mono"
                                style={{
                                    fontSize: 38,
                                    fontWeight: 700,
                                    color: "var(--lime)",
                                    letterSpacing: "-0.04em",
                                    lineHeight: 1
                                }}
                            >
                                +3
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.6 }}>
                                your lead
                            </div>
                        </div>
                        <CompFighter
                            side="right"
                            name="Marcus"
                            glyph="M"
                            color="var(--coral)"
                            dark
                            score={11}
                            streak="14d"
                            vals="3.7"
                            marker="@marcusf"
                        />
                    </div>

                    <div
                        style={{
                            position: "relative",
                            marginTop: 32,
                            paddingTop: 22,
                            borderTop: "1px solid rgba(255,255,255,0.08)",
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 24
                        }}
                    >
                        {STAKES.map((x, i) => (
                            <div key={i}>
                                <div
                                    style={{
                                        fontSize: 10,
                                        color: "var(--lime)",
                                        fontFamily: "Geist Mono",
                                        letterSpacing: "0.1em",
                                        marginBottom: 6
                                    }}
                                >
                                    {x.l}
                                </div>
                                <div
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 600,
                                        marginBottom: 2
                                    }}
                                >
                                    {x.v}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        opacity: 0.5
                                    }}
                                >
                                    {x.sub}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr",
                        gap: 16,
                        marginBottom: 18
                    }}
                >
                    <div className="card" style={{ padding: 24 }}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: 14
                            }}
                        >
                            <div>
                                <div
                                    className="eyebrow"
                                    style={{ marginBottom: 6 }}
                                >
                                    DAILY SCORE
                                </div>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 600
                                    }}
                                >
                                    Cumulative points · this week
                                </div>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 14,
                                    fontSize: 12
                                }}
                            >
                                <span
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6
                                    }}
                                >
                                    <span className="dot-lime" /> You
                                </span>
                                <span
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6
                                    }}
                                >
                                    <span className="dot-coral" /> Marcus
                                </span>
                            </div>
                        </div>
                        <DailyScoreChart you={YOU_DAILY} marcus={MAR_DAILY} />
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <div
                            className="eyebrow"
                            style={{ marginBottom: 4 }}
                        >
                            BREAKDOWN · BY SOURCE
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 11,
                                color: "var(--ink-3)",
                                padding: "14px 0 0"
                            }}
                        >
                            <span style={{ marginLeft: 60 }}>You</span>
                            <span>Marcus</span>
                            <span style={{ width: 80 }} />
                        </div>
                        {CATS.map((c, i) => (
                            <ScoreDelta key={i} {...c} />
                        ))}
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1.1fr 1fr",
                        gap: 16
                    }}
                >
                    <div className="card" style={{ padding: 22 }}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 14
                            }}
                        >
                            <div className="eyebrow">TIMELINE · TODAY</div>
                            <span className="chip">
                                <span className="dot-ink" /> Wed · 6 events
                            </span>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8
                            }}
                        >
                            {FEED.map((e, i) => (
                                <HourBar key={i} event={e} />
                            ))}
                        </div>
                    </div>

                    <div
                        className="card"
                        style={{
                            padding: 22,
                            display: "flex",
                            flexDirection: "column"
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 14
                            }}
                        >
                            <div className="eyebrow">TRASH TALK</div>
                            <span
                                style={{
                                    fontSize: 11,
                                    color: "var(--ink-3)"
                                }}
                            >
                                Jess joined as judge
                            </span>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                flex: 1
                            }}
                        >
                            {TRASH.map((m, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        flexDirection: m.mine
                                            ? "row-reverse"
                                            : "row",
                                        alignItems: "flex-end",
                                        gap: 8
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: "50%",
                                            background: m.color,
                                            color: m.dark
                                                ? "#fff"
                                                : "var(--ink)",
                                            display: "grid",
                                            placeItems: "center",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            flexShrink: 0
                                        }}
                                    >
                                        {m.who}
                                    </div>
                                    <div
                                        style={{
                                            background: m.mine
                                                ? "var(--ink)"
                                                : "var(--bg-sunken)",
                                            color: m.mine
                                                ? "var(--bg)"
                                                : "var(--ink)",
                                            borderRadius: 14,
                                            padding: "8px 12px",
                                            fontSize: 13,
                                            lineHeight: 1.4,
                                            maxWidth: 260
                                        }}
                                    >
                                        {!m.mine && (
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    color: "var(--ink-3)",
                                                    marginBottom: 2
                                                }}
                                            >
                                                {m.name}
                                            </div>
                                        )}
                                        {m.body}
                                    </div>
                                    <div
                                        className="mono"
                                        style={{
                                            fontSize: 10,
                                            color: "var(--ink-3)",
                                            alignSelf: "flex-end"
                                        }}
                                    >
                                        {m.time}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                gap: 6,
                                marginTop: 14,
                                paddingTop: 14,
                                borderTop: "1px solid var(--line-2)"
                            }}
                        >
                            <input
                                placeholder="say something regrettable…"
                                style={{
                                    flex: 1,
                                    border: "1px solid var(--line)",
                                    borderRadius: 999,
                                    padding: "8px 14px",
                                    fontSize: 13,
                                    outline: 0,
                                    font: "inherit"
                                }}
                            />
                            <button className="btn btn-primary btn-sm">
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
