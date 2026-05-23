// Hero preview card — a stylized phone screen showing today's goals.

import { SourceTile, type TileVariant } from "../../common/primitives"

export function HeroPreview() {
    const goals = [
        { src: "GH", tile: "ink", title: "Ship 5 commits", n: 3, goal: 5, unit: "/wk", tone: "lime" },
        { src: "LC", tile: "lime", title: "Solve 3 LeetCode", n: 1, goal: 3, unit: "/day", tone: "coral" },
        { src: "♥︎", tile: "coral", title: "Workout · Apple Health", n: 4, goal: 4, unit: "/wk", tone: "lime" },
        { src: "⏱", tile: "", title: "Screen Time under 2h", n: 1.4, goal: 2, unit: "h", tone: "lime" }
    ] as const

    return (
        <div
            className="relative h-[560px] w-[460px]"
            style={{ perspective: 1400 }}
        >
            {/* Floating ribbon — friend cheer */}
            <div
                className="absolute -right-[34px] top-7 z-[3] flex items-center gap-2.5 rounded-xl bg-ink px-3.5 py-2.5 text-[13px] font-medium text-bg shadow-lg"
                style={{ transform: "rotate(3deg)" }}
            >
                <div className="grid h-6 w-6 place-items-center rounded-full bg-coral text-[11px] font-semibold text-white">
                    M
                </div>
                <div>
                    <div className="font-semibold">Marcus is up 4 → 2</div>
                    <div className="text-[11px] opacity-60">
                        get on the leetcode lol
                    </div>
                </div>
            </div>

            {/* Streak callout */}
            <div
                className="absolute -left-9 bottom-[60px] z-[3] flex items-center gap-2.5 rounded-[14px] bg-lime px-4 py-3 text-ink shadow-lg"
                style={{ transform: "rotate(-4deg)" }}
            >
                <div className="mono text-[28px] font-bold leading-none">
                    23
                </div>
                <div className="text-xs leading-[1.2]">
                    <div className="font-semibold">day streak</div>
                    <div>longest yet</div>
                </div>
            </div>

            {/* The phone */}
            <div
                className="absolute inset-0 rounded-[36px] bg-bg-card p-7 shadow-lg"
                style={{
                    boxShadow:
                        "var(--shadow-lg), inset 0 0 0 1px var(--line-2)",
                    transform: "rotate(-2deg)"
                }}
            >
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <div className="eyebrow text-[10px]">WED · MAY 14</div>
                        <div className="text-[26px] font-bold tracking-[-0.03em]">
                            Today
                        </div>
                    </div>
                    <div className="flex">
                        {["L", "M", "J"].map((l, i) => (
                            <div
                                key={l}
                                className="grid h-8 w-8 place-items-center rounded-full border-2 border-bg-card text-xs font-semibold"
                                style={{
                                    background:
                                        i === 0
                                            ? "var(--lime)"
                                            : i === 1
                                              ? "var(--coral)"
                                              : "var(--ink)",
                                    color:
                                        i === 1
                                            ? "#fff"
                                            : i === 2
                                              ? "var(--bg)"
                                              : "var(--ink)",
                                    marginLeft: i === 0 ? 0 : -8
                                }}
                            >
                                {l}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2.5">
                    {goals.map((g, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 rounded-[14px] bg-bg-sunken px-3.5 py-3"
                        >
                            <SourceTile
                                label={g.src}
                                variant={g.tile as TileVariant}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-semibold">
                                    {g.title}
                                </div>
                                <div
                                    className="bar mt-1.5 h-[5px]"
                                    style={{ background: "rgba(0,0,0,0.06)" }}
                                >
                                    <i
                                        style={{
                                            width:
                                                Math.min(
                                                    100,
                                                    (g.n / g.goal) * 100
                                                ) + "%",
                                            background:
                                                g.tone === "coral"
                                                    ? "var(--coral)"
                                                    : "var(--lime)"
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="mono text-[13px] font-semibold text-ink-2">
                                {g.n}
                                <span className="text-ink-3">
                                    /{g.goal}
                                    {g.unit}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 border-t border-line-2 pt-4">
                    <div className="mb-2.5 flex justify-between">
                        <span className="eyebrow text-[10px]">WEEK 19</span>
                        <span className="mono text-[11px] text-ink-3">
                            14 / 20 pts
                        </span>
                    </div>
                    <div className="streak-row">
                        {["on", "on", "on", "today", "", "", ""].map((s, i) => (
                            <div
                                key={i}
                                className={`streak-dot h-[22px] flex-1 rounded ${s === "today" ? "on today" : s}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
