// Onboarding step 04 — invite friends to watch the goal.

import { OnbShell } from "./OnbShell"

export function StepInvite({
    next,
    back
}: {
    next: () => void
    back: () => void
}) {
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
