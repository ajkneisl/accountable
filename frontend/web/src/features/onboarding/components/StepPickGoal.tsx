// Onboarding step 02 — pick a goal template.

import { SourceTile, type TileVariant } from "../../common/primitives"
import { labelStyle } from "../styles"
import { OnbShell } from "./OnbShell"

export function StepPickGoal({
    next,
    back
}: {
    next: () => void
    back: () => void
}) {
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
