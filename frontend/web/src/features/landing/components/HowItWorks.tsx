// Landing section 02 — three-step explainer with inline preview cards.

import type { ReactNode } from "react"
import { SourceTile, type TileVariant } from "../../common/primitives"

export function HowItWorks() {
    const steps: { n: string; title: string; body: string; preview: ReactNode }[] =
        [
            {
                n: "01",
                title: "Set a goal",
                body: "Pick something specific and measurable. We help you scale it down until it’s attainable — not aspirational.",
                preview: (
                    <div className="card p-[18px] text-[13px]">
                        <div className="eyebrow mb-2">NEW GOAL</div>
                        <input
                            value="Ship 5 commits to side projects"
                            readOnly
                            className="w-full border-0 bg-transparent p-0 text-base font-semibold font-[inherit] text-ink outline-0"
                        />
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="chip bg-lime-soft text-lime-ink">
                                <span className="dot-lime" /> per week
                            </span>
                            <span className="chip">Mon → Sun</span>
                            <span className="chip">3 friends watching</span>
                        </div>
                    </div>
                )
            },
            {
                n: "02",
                title: "Connect a source",
                body: "Authenticate with the apps that already track this. No self-reporting, no fudging the numbers.",
                preview: (
                    <div className="card p-3.5 text-[13px]">
                        <div className="flex flex-col gap-2">
                            {[
                                {
                                    l: "GitHub",
                                    s: "Connected · lkroon",
                                    g: "GH",
                                    on: true,
                                    v: "ink"
                                },
                                {
                                    l: "LeetCode",
                                    s: "Connected · 14 solved",
                                    g: "LC",
                                    on: true,
                                    v: "lime"
                                },
                                {
                                    l: "Apple Health",
                                    s: "Connect",
                                    g: "♥︎",
                                    on: false,
                                    v: "coral"
                                }
                            ].map((r, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2.5"
                                >
                                    <SourceTile
                                        label={r.l}
                                        glyph={r.g}
                                        variant={r.v as TileVariant}
                                    />
                                    <div className="flex-1">
                                        <div className="font-semibold">
                                            {r.l}
                                        </div>
                                        <div className="text-[11px] text-ink-3">
                                            {r.s}
                                        </div>
                                    </div>
                                    <div
                                        className={`relative h-[18px] w-[30px] flex-shrink-0 rounded-full ${r.on ? "bg-lime" : "bg-line"}`}
                                    >
                                        <div
                                            className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm"
                                            style={{ left: r.on ? 14 : 2 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            },
            {
                n: "03",
                title: "Bring friends",
                body: "Add 1 friend or a whole group. Stakes are optional. Public shame is included by default.",
                preview: (
                    <div className="card p-3.5">
                        <div className="eyebrow mb-2.5">SQUAD · DEEP WORK</div>
                        {[
                            "You · 14pts",
                            "Marcus · 12pts",
                            "Jess · 11pts",
                            "Sam · 9pts"
                        ].map((p, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-2.5 py-[7px] ${i ? "border-t border-line-2" : ""}`}
                            >
                                <div
                                    className="grid h-[26px] w-[26px] place-items-center rounded-full text-[11px] font-semibold"
                                    style={{
                                        background: [
                                            "var(--lime)",
                                            "var(--coral)",
                                            "var(--ink)",
                                            "var(--bg-sunken)"
                                        ][i],
                                        color:
                                            i === 1
                                                ? "#fff"
                                                : i === 2
                                                  ? "var(--bg)"
                                                  : "var(--ink)"
                                    }}
                                >
                                    {p[0]}
                                </div>
                                <div className="flex-1 text-[13px] font-medium">
                                    {p}
                                </div>
                                {i === 0 && (
                                    <span className="chip bg-lime text-ink">
                                        leader
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )
            }
        ]

    return (
        <section id="how-it-works" className="px-16 pb-24">
            <div className="mb-10">
                <div className="eyebrow mb-2">02 · HOW IT WORKS</div>
                <h2 className="display m-0 max-w-[760px] text-5xl">
                    Three steps. Then you’re just keeping a promise — out loud.
                </h2>
            </div>
            <div className="grid grid-cols-3 gap-7">
                {steps.map((s, i) => (
                    <div key={i}>
                        <div className="mono mb-3.5 text-[13px] text-ink-3">
                            {s.n}
                        </div>
                        <h3 className="m-0 mb-2 text-2xl tracking-[-0.02em]">
                            {s.title}
                        </h3>
                        <p className="m-0 mb-[18px] text-[15px] leading-[1.5] text-ink-2">
                            {s.body}
                        </p>
                        {s.preview}
                    </div>
                ))}
            </div>
        </section>
    )
}
