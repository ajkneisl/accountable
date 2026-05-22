// Onboarding step 03 — connect a data source (OAuth-style screen).

import { SourceTile } from "../../common/primitives"
import { OnbShell } from "./OnbShell"

export function StepConnect({
    next,
    back
}: {
    next: () => void
    back: () => void
}) {
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
