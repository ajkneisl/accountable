// Landing section 03 — showcase of attainable goal cards.

import { SourceTile, type TileVariant } from "../../common/primitives"

export function GoalsShowcase() {
    const goals = [
        { src: "GH", tile: "ink", title: "Ship 5 commits / week", who: "3 of us. 2 weeks running.", pct: 60 },
        { src: "LC", tile: "lime", title: "Solve 3 LeetCode / day", who: "Just me, but Marcus is checking.", pct: 33 },
        { src: "♥︎", tile: "coral", title: "4 workouts / week", who: "The Saturday Soreness Club", pct: 100 },
        { src: "⏱", tile: "", title: "Under 2h on Instagram / day", who: "6 of us trying not to scroll.", pct: 70 }
    ] as const
    return (
        <section id="goals" className="px-16 pb-24">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <div className="eyebrow mb-2">
                        03 · GOALS PEOPLE ACTUALLY KEEP
                    </div>
                    <h2 className="display m-0 max-w-[760px] text-5xl">
                        Boring, attainable, repeatable. The kind that compound.
                    </h2>
                </div>
                <div className="max-w-[320px] text-sm text-ink-2">
                    We&#39;ll talk you out of <i>“get jacked”</i> and into{" "}
                    <i>“four workouts a week, measured by Apple Health”</i>. The
                    first goal is half the work.
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                {goals.map((g, i) => (
                    <div
                        key={i}
                        className="card flex min-h-[200px] flex-col gap-4 p-[22px]"
                    >
                        <SourceTile
                            label={g.src}
                            variant={g.tile as TileVariant}
                        />
                        <div className="flex-1">
                            <div className="mb-2 text-lg font-semibold tracking-[-0.01em]">
                                {g.title}
                            </div>
                            <div className="text-[13px] text-ink-3">
                                {g.who}
                            </div>
                        </div>
                        <div>
                            <div className="mb-1.5 flex justify-between text-xs">
                                <span className="text-ink-3">this week</span>
                                <span className="mono font-semibold text-ink-2">
                                    {g.pct}%
                                </span>
                            </div>
                            <div className="bar h-1.5">
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
