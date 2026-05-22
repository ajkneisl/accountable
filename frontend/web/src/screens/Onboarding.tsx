// Onboarding — five-step account-creation flow. Ported from the design bundle.
// Steps are driven by local state; Back / Continue move between them.

import { useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AccLogo, SourceTile, type TileVariant } from "../design/primitives"

const TOTAL = 5

function OnbShell({
    step,
    title,
    kicker,
    children,
    footer,
    side,
    onBack
}: {
    step: number
    title: ReactNode
    kicker?: string
    children: ReactNode
    footer: ReactNode
    side: ReactNode
    onBack?: () => void
}) {
    return (
        <div
            className="acc"
            style={{
                width: 1440,
                margin: "0 auto",
                minHeight: 900,
                display: "flex",
                flexDirection: "column",
                background: "var(--bg)"
            }}
        >
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "24px 36px"
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
                        STEP {String(step).padStart(2, "0")} /{" "}
                        {String(TOTAL).padStart(2, "0")}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                        {Array.from({ length: TOTAL }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: 24,
                                    height: 4,
                                    borderRadius: 2,
                                    background:
                                        i < step
                                            ? "var(--ink)"
                                            : "var(--line)"
                                }}
                            />
                        ))}
                    </div>
                    <Link
                        to="/"
                        style={{
                            fontSize: 13,
                            color: "var(--ink-3)",
                            textDecoration: "none",
                            marginLeft: 8
                        }}
                    >
                        Save &amp; quit
                    </Link>
                </div>
            </header>

            <div
                style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    padding: "20px 0 0",
                    alignItems: "stretch"
                }}
            >
                <div
                    style={{
                        padding: "40px 36px 40px 88px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                    }}
                >
                    {kicker && (
                        <div
                            className="eyebrow"
                            style={{ marginBottom: 14 }}
                        >
                            {kicker}
                        </div>
                    )}
                    <h1
                        className="display"
                        style={{
                            fontSize: 56,
                            margin: "0 0 20px",
                            maxWidth: 560
                        }}
                    >
                        {title}
                    </h1>
                    {children}
                </div>
                <div
                    style={{
                        padding: "40px 88px 40px 36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {side}
                </div>
            </div>

            <footer
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 36px 36px"
                }}
            >
                {onBack ? (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={onBack}
                    >
                        ← Back
                    </button>
                ) : (
                    <div />
                )}
                {footer}
            </footer>
        </div>
    )
}

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--ink-2)",
    marginBottom: 6
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--line)",
    borderRadius: 10,
    padding: "11px 14px",
    font: "inherit",
    fontSize: 14,
    outline: 0,
    marginBottom: 14
}

// ── 01 · Sign up ─────────────────────────────────────────────
function StepSignup({ next }: { next: () => void }) {
    const side = (
        <div className="card" style={{ padding: 32, width: 420 }}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginBottom: 22
                }}
            >
                <button
                    className="btn btn-line"
                    style={{
                        justifyContent: "flex-start",
                        padding: "12px 16px"
                    }}
                >
                    <span
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: "var(--ink)",
                            color: "var(--bg)",
                            display: "inline-grid",
                            placeItems: "center",
                            fontSize: 11,
                            fontWeight: 700
                        }}
                    >

                    </span>
                    Continue with Apple
                </button>
                <button
                    className="btn btn-line"
                    style={{
                        justifyContent: "flex-start",
                        padding: "12px 16px"
                    }}
                >
                    <span
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background:
                                "conic-gradient(from 0deg, #ea4335, #fbbc04, #34a853, #4285f4, #ea4335)"
                        }}
                    />
                    Continue with Google
                </button>
                <button
                    className="btn btn-line"
                    style={{
                        justifyContent: "flex-start",
                        padding: "12px 16px"
                    }}
                >
                    <span
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: "var(--ink)",
                            color: "var(--bg)",
                            display: "inline-grid",
                            placeItems: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: "Geist Mono"
                        }}
                    >
                        GH
                    </span>
                    Continue with GitHub
                </button>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 18
                }}
            >
                <hr className="divider" style={{ flex: 1 }} />
                <span
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-3)" }}
                >
                    OR EMAIL
                </span>
                <hr className="divider" style={{ flex: 1 }} />
            </div>

            <label style={labelStyle}>Your name</label>
            <input defaultValue="Lukas Kroon" style={inputStyle} />

            <label style={labelStyle}>Email</label>
            <input defaultValue="lukas@kroon.work" style={inputStyle} />

            <label style={labelStyle}>Pick a username</label>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "11px 14px",
                    marginBottom: 6
                }}
            >
                <span
                    style={{
                        color: "var(--ink-3)",
                        fontSize: 14,
                        marginRight: 2
                    }}
                >
                    accountable.so/
                </span>
                <input
                    defaultValue="lukas-k"
                    style={{
                        flex: 1,
                        border: 0,
                        font: "inherit",
                        fontSize: 14,
                        fontWeight: 600,
                        outline: 0,
                        background: "transparent",
                        color: "var(--ink)"
                    }}
                />
                <span
                    style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--lime)",
                        color: "var(--ink)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 700
                    }}
                >
                    ✓
                </span>
            </div>
            <div
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)" }}
            >
                available · friends find you here
            </div>
        </div>
    )

    return (
        <OnbShell
            step={1}
            kicker="01 · CREATE YOUR ACCOUNT"
            title={
                <>
                    Goals stick when
                    <br />
                    someone&apos;s watching.
                </>
            }
            side={side}
            footer={
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16
                    }}
                >
                    <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                        Already have one?{" "}
                        <Link to="/login" style={{ color: "var(--ink)" }}>
                            Sign in
                        </Link>
                    </span>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={next}
                    >
                        Continue →
                    </button>
                </div>
            }
        >
            <p
                style={{
                    fontSize: 17,
                    color: "var(--ink-2)",
                    maxWidth: 480,
                    marginBottom: 28,
                    lineHeight: 1.5
                }}
            >
                We&apos;ll set you up with one goal, one source, and one friend.
                That&apos;s the whole onboarding. Should take about 90 seconds.
            </p>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                    maxWidth: 460
                }}
            >
                {[
                    { n: "90s", l: "avg setup" },
                    { n: "4,210", l: "on track this week" },
                    { n: "32", l: "data sources" },
                    { n: "free", l: "first 3 friends" }
                ].map((s, i) => (
                    <div
                        key={i}
                        style={{
                            padding: "12px 14px",
                            borderLeft: "2px solid var(--ink)",
                            background: "var(--bg-card)"
                        }}
                    >
                        <div
                            className="mono"
                            style={{
                                fontSize: 22,
                                fontWeight: 700,
                                letterSpacing: "-0.02em"
                            }}
                        >
                            {s.n}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--ink-3)"
                            }}
                        >
                            {s.l}
                        </div>
                    </div>
                ))}
            </div>
        </OnbShell>
    )
}

// ── 02 · Pick a goal ─────────────────────────────────────────
function StepPickGoal({ next, back }: { next: () => void; back: () => void }) {
    const templates: {
        glyph: string
        tile: TileVariant
        name: string
        sub: string
        kind: string
        selected?: boolean
        pop?: string
        custom?: boolean
    }[] = [
        { glyph: "GH", tile: "ink", name: "Ship code", sub: "commits / PRs", kind: "GitHub", selected: true, pop: "Most popular" },
        { glyph: "LC", tile: "lime", name: "Practice LeetCode", sub: "problems / day", kind: "LeetCode" },
        { glyph: "♥︎", tile: "coral", name: "Workout", sub: "sessions / week", kind: "Apple Health" },
        { glyph: "⏱", tile: "", name: "Less Instagram", sub: "screen time / day", kind: "Apple Screen Time" },
        { glyph: "ST", tile: "lime", name: "Run more", sub: "kilometres / week", kind: "Strava" },
        { glyph: "DL", tile: "coral", name: "Learn a language", sub: "lessons / day", kind: "Duolingo" },
        { glyph: "NT", tile: "ink", name: "Write more", sub: "words / day", kind: "Notion" },
        { glyph: "ZZ", tile: "", name: "Sleep on time", sub: "in bed by · hours", kind: "Sleep Cycle" },
        { glyph: "✎", tile: "lime", name: "Custom", sub: "pick any source", kind: "", custom: true }
    ]

    const side = (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                width: 420
            }}
        >
            <div className="eyebrow">PICKED</div>
            <div
                className="card"
                style={{
                    padding: 24,
                    borderColor: "var(--ink)",
                    boxShadow: "0 0 0 2px var(--ink), var(--shadow-md)"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginBottom: 16
                    }}
                >
                    <SourceTile label="GH" variant="ink" />
                    <div>
                        <div
                            style={{
                                fontSize: 18,
                                fontWeight: 700,
                                letterSpacing: "-0.01em"
                            }}
                        >
                            Ship code
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--ink-3)"
                            }}
                        >
                            commits via GitHub · accountable counts pushes, not
                            noise
                        </div>
                    </div>
                </div>

                <label style={{ ...labelStyle, marginBottom: 6 }}>
                    How many?
                </label>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 16
                    }}
                >
                    <button
                        className="btn btn-line btn-sm"
                        style={{ width: 32, height: 32, padding: 0 }}
                    >
                        −
                    </button>
                    <div
                        className="mono"
                        style={{
                            fontSize: 30,
                            fontWeight: 700,
                            letterSpacing: "-0.03em",
                            minWidth: 40,
                            textAlign: "center"
                        }}
                    >
                        5
                    </div>
                    <button
                        className="btn btn-line btn-sm"
                        style={{ width: 32, height: 32, padding: 0 }}
                    >
                        +
                    </button>
                    <span
                        style={{
                            marginLeft: 8,
                            fontSize: 14,
                            color: "var(--ink-3)"
                        }}
                    >
                        commits
                    </span>
                </div>

                <label style={{ ...labelStyle, marginBottom: 6 }}>
                    How often?
                </label>
                <div
                    style={{
                        display: "flex",
                        gap: 6,
                        marginBottom: 16
                    }}
                >
                    {["Daily", "Weekly", "Mon–Fri"].map((p) => (
                        <div
                            key={p}
                            className="chip"
                            style={
                                p === "Weekly"
                                    ? {
                                          background: "var(--ink)",
                                          color: "var(--bg)"
                                      }
                                    : undefined
                            }
                        >
                            {p}
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        padding: 12,
                        background: "var(--lime-soft)",
                        borderRadius: 10,
                        fontSize: 12,
                        color: "var(--lime-ink)"
                    }}
                >
                    <b>Heads up:</b> last 90 days you averaged 4.2 commits/wk on
                    side projects. Picking 5 keeps it attainable.
                </div>
            </div>
        </div>
    )

    return (
        <OnbShell
            step={2}
            kicker="02 · YOUR FIRST GOAL"
            title={
                <>
                    Pick something
                    <br />
                    small enough to keep.
                </>
            }
            side={side}
            onBack={back}
            footer={
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={next}
                >
                    Continue → Connect GitHub
                </button>
            }
        >
            <p
                style={{
                    fontSize: 16,
                    color: "var(--ink-2)",
                    maxWidth: 480,
                    marginBottom: 22
                }}
            >
                Templates pre-fill the source &amp; cadence we&apos;ve seen
                people actually stick to. You can tune the numbers next.
            </p>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 10,
                    maxWidth: 540
                }}
            >
                {templates.map((t, i) => (
                    <div
                        key={i}
                        className="card"
                        style={{
                            padding: 14,
                            cursor: "pointer",
                            position: "relative",
                            borderColor: t.selected
                                ? "var(--ink)"
                                : "var(--line-2)",
                            boxShadow: t.selected
                                ? "0 0 0 2px var(--ink)"
                                : "var(--shadow-sm)",
                            background: t.custom
                                ? "var(--bg-sunken)"
                                : "var(--bg-card)"
                        }}
                    >
                        {t.pop && (
                            <span
                                className="chip"
                                style={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    background: "var(--lime)",
                                    color: "var(--ink)",
                                    fontSize: 10,
                                    padding: "2px 6px"
                                }}
                            >
                                {t.pop}
                            </span>
                        )}
                        <SourceTile label={t.glyph} variant={t.tile} />
                        <div
                            style={{
                                marginTop: 10,
                                fontSize: 14,
                                fontWeight: 600
                            }}
                        >
                            {t.name}
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: "var(--ink-3)"
                            }}
                        >
                            {t.sub}
                        </div>
                        {t.kind && (
                            <div
                                className="mono"
                                style={{
                                    fontSize: 10,
                                    color: "var(--ink-3)",
                                    marginTop: 6
                                }}
                            >
                                via {t.kind}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </OnbShell>
    )
}

// ── 03 · Connect a source ────────────────────────────────────
function StepConnect({ next, back }: { next: () => void; back: () => void }) {
    const permissions = [
        { l: "Read public & private repo metadata", sub: "We see commit counts, never code", on: true },
        { l: "Read pull-request events", sub: "For PR-based goals", on: true },
        { l: "Read your profile", sub: "username + avatar", on: true },
        { l: "Write to your account", sub: "Never. We refuse this scope.", off: true }
    ]

    const side = (
        <div style={{ width: 460, position: "relative" }}>
            <div
                style={{
                    position: "absolute",
                    top: -18,
                    left: -18,
                    right: 18,
                    bottom: 18,
                    background: "var(--bg-sunken)",
                    borderRadius: 22,
                    transform: "rotate(-2deg)"
                }}
            />
            <div
                className="card"
                style={{
                    position: "relative",
                    padding: 28,
                    borderRadius: 22,
                    boxShadow: "var(--shadow-lg)"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginBottom: 22
                    }}
                >
                    <SourceTile label="GH" variant="ink" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>
                            github.com
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--ink-3)"
                            }}
                        >
                            OAuth · accountable-app
                        </div>
                    </div>
                    <span
                        className="chip"
                        style={{
                            background: "var(--lime-soft)",
                            color: "var(--lime-ink)"
                        }}
                    >
                        <span className="dot-lime" /> secure
                    </span>
                </div>

                <div className="eyebrow" style={{ marginBottom: 12 }}>
                    WE&apos;LL ASK FOR
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        marginBottom: 22
                    }}
                >
                    {permissions.map((p, i) => (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 12
                            }}
                        >
                            <div
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 6,
                                    marginTop: 1,
                                    background: p.off
                                        ? "transparent"
                                        : "var(--lime)",
                                    border: p.off
                                        ? "1px dashed var(--ink-3)"
                                        : "none",
                                    color: "var(--ink)",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    flexShrink: 0
                                }}
                            >
                                {p.off ? "×" : "✓"}
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600
                                    }}
                                >
                                    {p.l}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--ink-3)"
                                    }}
                                >
                                    {p.sub}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                >
                    Authorize on github.com →
                </button>
                <div
                    className="mono"
                    style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        textAlign: "center",
                        marginTop: 12
                    }}
                >
                    opens github · revoke any time
                </div>
            </div>
        </div>
    )

    return (
        <OnbShell
            step={3}
            kicker="03 · CONNECT A SOURCE"
            title={
                <>
                    We trust the data,
                    <br />
                    not the promises.
                </>
            }
            side={side}
            onBack={back}
            footer={
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14
                    }}
                >
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={next}
                    >
                        Skip for now
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={next}
                    >
                        Connect GitHub →
                    </button>
                </div>
            }
        >
            <p
                style={{
                    fontSize: 16,
                    color: "var(--ink-2)",
                    maxWidth: 480,
                    marginBottom: 24
                }}
            >
                Accountable reads from the apps that already track this. No
                self-reporting, no fudging the numbers, no Sunday-night regret
                edits.
            </p>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    maxWidth: 480
                }}
            >
                {[
                    {
                        l: "Read-only",
                        s: "We can never push, write, or send on your behalf."
                    },
                    {
                        l: "Counts, not contents",
                        s: "GitHub shows us push events. Apple Health shows session totals. We see numbers."
                    },
                    {
                        l: "Revoke any time",
                        s: "One click in Settings disconnects and deletes history."
                    }
                ].map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 12 }}>
                        <div
                            style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: "var(--bg-sunken)",
                                color: "var(--ink)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 11,
                                fontWeight: 700,
                                flexShrink: 0
                            }}
                        >
                            {i + 1}
                        </div>
                        <div>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600
                                }}
                            >
                                {r.l}
                            </div>
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "var(--ink-3)"
                                }}
                            >
                                {r.s}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </OnbShell>
    )
}

// ── 04 · Invite friends ──────────────────────────────────────
function StepInvite({ next, back }: { next: () => void; back: () => void }) {
    const suggested = [
        { l: "M", n: "Marcus Frost", u: "@marcusf", why: "You both have GitHub linked", c: "var(--coral)", dark: true, added: true },
        { l: "J", n: "Jess Park", u: "@jess", why: "In your contacts", c: "var(--lime)", added: true },
        { l: "S", n: "Sam Okafor", u: "@samok", why: "Already on Accountable", c: "var(--ink)", dark: true },
        { l: "P", n: "Priya R.", u: "@priya.r", why: "In your contacts", c: "var(--coral)", dark: true }
    ]

    const side = (
        <div style={{ width: 440 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
                PREVIEW · WHAT THEY&apos;LL SEE
            </div>
            <div
                className="card"
                style={{
                    padding: 24,
                    background: "var(--ink)",
                    color: "var(--bg)",
                    border: "none",
                    borderRadius: 18
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
                    <div>
                        <div
                            style={{
                                fontSize: 18,
                                fontWeight: 700,
                                letterSpacing: "-0.01em"
                            }}
                        >
                            Ship code · 5/wk
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>
                            Lukas&apos;s goal · Mon → Sun
                        </div>
                    </div>
                    <span
                        className="chip"
                        style={{
                            background: "rgba(255,255,255,0.08)",
                            color: "var(--bg)"
                        }}
                    >
                        3 watching
                    </span>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                    }}
                >
                    {[
                        { n: "You (Lukas)", s: "3 / 5", mine: true },
                        { n: "Marcus Frost", s: "— invited", pending: true },
                        { n: "Jess Park", s: "— invited", pending: true }
                    ].map((r, i) => (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 12px",
                                background: r.mine
                                    ? "rgba(166, 217, 71, 0.14)"
                                    : "rgba(255,255,255,0.04)",
                                borderRadius: 10
                            }}
                        >
                            <div
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: "50%",
                                    background: [
                                        "var(--lime)",
                                        "var(--coral)",
                                        "var(--lime)"
                                    ][i],
                                    color: i === 1 ? "#fff" : "var(--ink)",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: 11,
                                    fontWeight: 700
                                }}
                            >
                                {r.n[0] === "Y" ? "L" : r.n[0]}
                            </div>
                            <div
                                style={{
                                    flex: 1,
                                    fontSize: 13,
                                    fontWeight: 500
                                }}
                            >
                                {r.n}
                            </div>
                            <div
                                className="mono"
                                style={{
                                    fontSize: 12,
                                    opacity: r.pending ? 0.5 : 1,
                                    color: r.mine
                                        ? "var(--lime)"
                                        : "inherit"
                                }}
                            >
                                {r.s}
                            </div>
                        </div>
                    ))}
                </div>
                <div
                    style={{
                        marginTop: 18,
                        paddingTop: 14,
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 12,
                        opacity: 0.6,
                        lineHeight: 1.5
                    }}
                >
                    They get a once-daily digest. No pings. They cheer or jeer.
                    Sunday we tally.
                </div>
            </div>
        </div>
    )

    return (
        <OnbShell
            step={4}
            kicker="04 · BRING SOMEONE IN"
            title={
                <>
                    A goal alone is a wish.
                    <br />
                    A goal shared is a deal.
                </>
            }
            side={side}
            onBack={back}
            footer={
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14
                    }}
                >
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={next}
                    >
                        Skip — I&apos;ll add later
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={next}
                    >
                        Send 2 invites →
                    </button>
                </div>
            }
        >
            <p
                style={{
                    fontSize: 16,
                    color: "var(--ink-2)",
                    maxWidth: 480,
                    marginBottom: 20
                }}
            >
                One person makes a difference. Two makes a habit. Pick at least
                one from below — or paste a phone, email, or @username.
            </p>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 18,
                    maxWidth: 480
                }}
            >
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        padding: "10px 14px",
                        gap: 8,
                        background: "var(--bg-card)"
                    }}
                >
                    <span style={{ color: "var(--ink-3)" }}>＠</span>
                    <input
                        defaultValue="marcus@"
                        style={{
                            flex: 1,
                            border: 0,
                            outline: 0,
                            font: "inherit",
                            fontSize: 14,
                            background: "transparent"
                        }}
                    />
                </div>
                <button className="btn btn-line btn-sm">+ Add</button>
            </div>

            <div className="eyebrow" style={{ marginBottom: 10 }}>
                SUGGESTED · BASED ON YOUR ACCOUNT
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    maxWidth: 480
                }}
            >
                {suggested.map((p, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: p.added
                                ? "var(--bg-sunken)"
                                : "transparent"
                        }}
                    >
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: p.c,
                                color: p.dark ? "#fff" : "var(--ink)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 13,
                                fontWeight: 700
                            }}
                        >
                            {p.l}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600
                                }}
                            >
                                {p.n}
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: "var(--ink-3)"
                                }}
                            >
                                {p.u} · {p.why}
                            </div>
                        </div>
                        {p.added ? (
                            <span
                                className="chip"
                                style={{
                                    background: "var(--lime)",
                                    color: "var(--ink)"
                                }}
                            >
                                ✓ added
                            </span>
                        ) : (
                            <button className="btn btn-line btn-sm">
                                Add
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </OnbShell>
    )
}

// ── 05 · You're in ───────────────────────────────────────────
const CONFETTI: [number, number, string, number][] = [
    [120, 220, "lime", 10], [1280, 180, "coral", 12], [340, 760, "ink", 8],
    [1180, 720, "lime", 14], [80, 540, "coral", 9], [1340, 460, "ink", 6],
    [220, 380, "coral", 7], [1100, 320, "lime", 11], [400, 100, "ink", 8],
    [1000, 800, "coral", 10], [60, 760, "lime", 8], [1380, 820, "lime", 9],
    [240, 620, "ink", 6], [1180, 580, "coral", 8], [520, 200, "lime", 7]
]

function StepDone() {
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

export default function Onboarding() {
    const [step, setStep] = useState(1)
    const next = () => setStep((s) => Math.min(TOTAL, s + 1))
    const back = () => setStep((s) => Math.max(1, s - 1))

    switch (step) {
        case 1:
            return <StepSignup next={next} />
        case 2:
            return <StepPickGoal next={next} back={back} />
        case 3:
            return <StepConnect next={next} back={back} />
        case 4:
            return <StepInvite next={next} back={back} />
        default:
            return <StepDone />
    }
}
