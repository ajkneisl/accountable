// Onboarding step 05 — confetti finale with the goal summary.

import { useNavigate } from "react-router-dom"
import { AccLogo, SourceTile } from "../../common/primitives"

const CONFETTI: [number, number, string, number][] = [
    [120, 220, "lime", 10], [1280, 180, "coral", 12], [340, 760, "ink", 8],
    [1180, 720, "lime", 14], [80, 540, "coral", 9], [1340, 460, "ink", 6],
    [220, 380, "coral", 7], [1100, 320, "lime", 11], [400, 100, "ink", 8],
    [1000, 800, "coral", 10], [60, 760, "lime", 8], [1380, 820, "lime", 9],
    [240, 620, "ink", 6], [1180, 580, "coral", 8], [520, 200, "lime", 7]
]

export function StepDone() {
    const navigate = useNavigate()
    return (
        <div className="acc relative mx-auto flex min-h-[900px] w-[1440px] flex-col overflow-hidden bg-bg">
            <header className="z-[2] flex items-center justify-between px-9 py-6">
                <AccLogo />
                <div className="flex items-center gap-3.5">
                    <span className="mono text-[11px] tracking-[0.1em] text-ink-3">
                        STEP 05 / 05
                    </span>
                    <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-1 w-6 rounded-[2px] bg-ink"
                            />
                        ))}
                    </div>
                </div>
            </header>

            <div className="pointer-events-none absolute inset-0">
                {CONFETTI.map(([x, y, c, sz], i) => (
                    <div
                        key={i}
                        className="absolute rounded-[3px] opacity-80"
                        style={{
                            left: x,
                            top: y,
                            width: sz,
                            height: sz,
                            background:
                                c === "lime"
                                    ? "var(--lime)"
                                    : c === "coral"
                                      ? "var(--coral)"
                                      : "var(--ink)",
                            transform: `rotate(${(i * 23) % 90 - 45}deg)`
                        }}
                    />
                ))}
            </div>

            <main className="z-[1] flex flex-1 items-center justify-center px-9">
                <div
                    className="grid max-w-[1200px] items-center gap-[60px]"
                    style={{ gridTemplateColumns: "1fr 1.1fr" }}
                >
                    <div>
                        <div className="eyebrow mb-3.5 text-lime-ink">
                            05 · YOU&apos;RE IN
                        </div>
                        <h1 className="display mb-[22px] mt-0 text-[84px]">
                            You&apos;ve got
                            <br />
                            <span
                                className="rounded-xl bg-lime px-3"
                                style={{
                                    WebkitBoxDecorationBreak: "clone",
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
                        <p className="mb-7 max-w-[480px] text-[17px] leading-[1.5] text-ink-2">
                            Marcus and Jess will be notified Sunday with your
                            first-week recap. First thing you should do? Ship a
                            commit. We&apos;re watching.
                        </p>
                        <div className="flex gap-2.5">
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
                        <div className="mono mt-[22px] text-xs text-ink-3">
                            ⌘ K · open quick add · anywhere
                        </div>
                    </div>

                    <div className="card rounded-[20px] p-7 shadow-lg">
                        <div className="eyebrow mb-[18px]">YOUR SETUP</div>

                        <div className="flex items-center gap-3.5 border-b border-line-2 pb-[18px]">
                            <SourceTile label="GH" variant="ink" />
                            <div className="flex-1">
                                <div className="text-base font-bold">
                                    Ship 5 commits / week
                                </div>
                                <div className="text-xs text-ink-3">
                                    GitHub · @lkroon · Mon → Sun
                                </div>
                            </div>
                            <span className="chip bg-lime-soft text-lime-ink">
                                active
                            </span>
                        </div>

                        <div className="border-b border-line-2 py-[18px]">
                            <div className="mb-2.5 text-xs text-ink-3">
                                watchers
                            </div>
                            <div className="flex gap-2">
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
                                        className="flex items-center gap-2 rounded-full bg-bg-sunken py-1.5 pl-1.5 pr-3"
                                    >
                                        <div
                                            className="grid h-[22px] w-[22px] place-items-center rounded-full text-[11px] font-bold"
                                            style={{
                                                background: w.c,
                                                color: w.d
                                                    ? "#fff"
                                                    : "var(--ink)"
                                            }}
                                        >
                                            {w.l}
                                        </div>
                                        <span className="text-xs font-medium">
                                            {w.n}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pb-2 pt-[18px]">
                            <div className="eyebrow mb-2.5">
                                WEEK 19 · STARTS NOW
                            </div>
                            <div className="streak-row">
                                {[
                                    "today", "", "", "", "", "", ""
                                ].map((s, i) => (
                                    <div
                                        key={i}
                                        className={`streak-dot h-7 flex-1 rounded-[5px] ${s === "today" ? "on today" : ""}`}
                                    />
                                ))}
                            </div>
                            <div className="mt-2 flex justify-between">
                                {["M", "T", "W", "T", "F", "S", "S"].map(
                                    (d, i) => (
                                        <span
                                            key={i}
                                            className={`mono text-[10px] ${i === 0 ? "font-semibold text-ink" : "text-ink-3"}`}
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
