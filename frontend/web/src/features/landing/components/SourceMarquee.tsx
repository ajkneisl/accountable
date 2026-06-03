import { SourceTile, type TileVariant } from "../../common/primitives"

const sources = [
    {
        label: "GitHub",
        glyph: "GH",
        kind: "commits",
        desc: "Track commits, PRs, and review activity straight from your repos."
    },
    {
        label: "LeetCode",
        glyph: "LC",
        kind: "problems",
        desc: "Count solved problems and streaks to keep your prep on pace."
    },
    {
        label: "Apple Health",
        glyph: "♥︎",
        kind: "workouts / steps",
        desc: "Pull in workouts, steps, and activity rings from your iPhone."
    },
    {
        label: "Screen Time",
        glyph: "⏱",
        kind: "app limits",
        desc: "Hold yourself to daily app limits and cut down distractions."
    },
    {
        label: "Sleep",
        glyph: "ZZ",
        kind: "hours slept",
        desc: "Log hours slept and stay honest about your rest schedule."
    }
]
const variants: TileVariant[] = ["ink", "lime", "coral", "", ""]

/**
 * Landing section 1
 *
 * Information about sources.
 */
export function SourceMarquee() {
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
                        className="card group relative flex items-center gap-3.5 p-[18px]"
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
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-lg bg-ink px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                            {s.desc}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
