// Onboarding step 02 — pick a goal template.

import { SourceTile, type TileVariant } from "../../common/primitives"
import { OnbShell } from "./OnbShell"

const labelClass = "block text-xs font-medium text-ink-2 mb-1.5"

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
        <div className="flex w-[420px] flex-col gap-3.5">
            <div className="eyebrow">PICKED</div>
            <div
                className="card border-ink p-6"
                style={{
                    boxShadow: "0 0 0 2px var(--ink), var(--shadow-md)"
                }}
            >
                <div className="mb-4 flex items-center gap-3.5">
                    <SourceTile label="GH" variant="ink" />
                    <div>
                        <div className="text-lg font-bold tracking-[-0.01em]">
                            Ship code
                        </div>
                        <div className="text-xs text-ink-3">
                            commits via GitHub · accountable counts pushes, not
                            noise
                        </div>
                    </div>
                </div>

                <label className={labelClass}>How many?</label>
                <div className="mb-4 flex items-center gap-2">
                    <button className="btn btn-line btn-sm h-8 w-8 p-0">
                        −
                    </button>
                    <div className="mono min-w-[40px] text-center text-3xl font-bold tracking-[-0.03em]">
                        5
                    </div>
                    <button className="btn btn-line btn-sm h-8 w-8 p-0">
                        +
                    </button>
                    <span className="ml-2 text-sm text-ink-3">commits</span>
                </div>

                <label className={labelClass}>How often?</label>
                <div className="mb-4 flex gap-1.5">
                    {["Daily", "Weekly", "Mon–Fri"].map((p) => (
                        <div
                            key={p}
                            className={`chip ${p === "Weekly" ? "bg-ink text-bg" : ""}`}
                        >
                            {p}
                        </div>
                    ))}
                </div>

                <div className="rounded-[10px] bg-lime-soft p-3 text-xs text-lime-ink">
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
            <p className="mb-[22px] max-w-[480px] text-base text-ink-2">
                Templates pre-fill the source &amp; cadence we&apos;ve seen
                people actually stick to. You can tune the numbers next.
            </p>
            <div className="grid max-w-[540px] grid-cols-3 gap-2.5">
                {templates.map((t, i) => (
                    <div
                        key={i}
                        className={`card relative cursor-pointer p-3.5 ${t.selected ? "border-ink" : ""} ${t.custom ? "bg-bg-sunken" : ""}`}
                        style={
                            t.selected
                                ? { boxShadow: "0 0 0 2px var(--ink)" }
                                : undefined
                        }
                    >
                        {t.pop && (
                            <span className="chip absolute right-2 top-2 bg-lime px-1.5 py-0.5 text-[10px] text-ink">
                                {t.pop}
                            </span>
                        )}
                        <SourceTile label={t.glyph} variant={t.tile} />
                        <div className="mt-2.5 text-sm font-semibold">
                            {t.name}
                        </div>
                        <div className="text-[11px] text-ink-3">{t.sub}</div>
                        {t.kind && (
                            <div className="mono mt-1.5 text-[10px] text-ink-3">
                                via {t.kind}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </OnbShell>
    )
}
