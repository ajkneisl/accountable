// Landing section 01 — the grid of supported data sources.

import { SourceTile, type TileVariant } from "../../common/primitives"

export function SourceMarquee() {
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
        <section id="sources" style={{ padding: "0 64px 96px" }}>
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
