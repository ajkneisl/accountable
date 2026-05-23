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
        <section id="sources" className="px-16 pb-24">
            <div className="mb-8 flex items-baseline justify-between">
                <div>
                    <div className="eyebrow mb-2">01 · SOURCES</div>
                    <h2 className="display m-0 max-w-[720px] text-5xl">
                        Wire up the apps you already use. We trust the data, not
                        the promises.
                    </h2>
                </div>
                <button className="btn btn-line">All 32 sources →</button>
            </div>

            <div className="grid grid-cols-5 gap-3">
                {sources.map((s, i) => (
                    <div
                        key={i}
                        className="card flex items-center gap-3.5 p-[18px]"
                    >
                        <SourceTile
                            label={s.label}
                            glyph={s.glyph}
                            variant={variants[i % 5]}
                        />
                        <div className="min-w-0">
                            <div className="text-[15px] font-semibold">
                                {s.label}
                            </div>
                            <div className="text-xs text-ink-3">
                                {s.kind}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
