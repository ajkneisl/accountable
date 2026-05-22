// App shell sidebar — shared by Dashboard and Competition.

import { Link } from "react-router-dom"
import { AccLogo, SourceTile, type TileVariant } from "./primitives"

type Goal = {
    tile: TileVariant
    g: string
    name: string
    sub: string
    warn?: boolean
    done?: boolean
}

type Squad = { c: string; n: string; d: string; to?: string }

const GOALS: Goal[] = [
    { tile: "ink", g: "GH", name: "Ship 5 commits", sub: "3 / 5 · this week" },
    { tile: "lime", g: "LC", name: "LeetCode daily", sub: "1 / 3 · today", warn: true },
    { tile: "coral", g: "♥︎", name: "Workouts", sub: "4 / 4 · done ✓", done: true },
    { tile: "", g: "⏱", name: "Screen Time", sub: "1.4 / 2h · today" }
]

const SQUADS: Squad[] = [
    { c: "var(--lime)", n: "Deep Work", d: "4 friends · live week" },
    { c: "var(--coral)", n: "Sat Soreness Club", d: "6 friends" },
    {
        c: "var(--ink)",
        n: "You vs Marcus",
        d: "head-to-head · 4d left",
        to: "/competition"
    }
]

export function Sidebar({ onSignOut }: { onSignOut?: () => void }) {
    return (
        <aside className="flex w-[280px] flex-col gap-7 border-r border-line-2 bg-bg px-5 py-6">
            <Link to="/dashboard" className="text-inherit no-underline">
                <AccLogo size={16} />
            </Link>

            <div>
                <div className="eyebrow mb-3">MY GOALS</div>
                <div className="flex flex-col gap-1">
                    {GOALS.map((g, i) => (
                        <div
                            key={i}
                            className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 ${
                                i === 0 ? "bg-bg-sunken" : ""
                            }`}
                        >
                            <SourceTile label={g.g} variant={g.tile} />
                            <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-semibold">
                                    {g.name}
                                </div>
                                <div
                                    className={`text-[11px] ${
                                        g.warn
                                            ? "text-coral-ink"
                                            : g.done
                                              ? "text-lime-ink"
                                              : "text-ink-3"
                                    }`}
                                >
                                    {g.sub}
                                </div>
                            </div>
                        </div>
                    ))}
                    <Link
                        to="/onboarding"
                        className="btn btn-line btn-sm mt-1.5 justify-start"
                    >
                        + New goal
                    </Link>
                </div>
            </div>

            <div>
                <div className="eyebrow mb-3">SQUADS</div>
                <div className="flex flex-col gap-1">
                    {SQUADS.map((s, i) => {
                        const inner = (
                            <>
                                <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ background: s.c }}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-medium">
                                        {s.n}
                                    </div>
                                    <div className="text-[11px] text-ink-3">
                                        {s.d}
                                    </div>
                                </div>
                            </>
                        )
                        const className =
                            "flex cursor-pointer items-center gap-3 px-2.5 py-2 text-inherit no-underline"
                        return s.to ? (
                            <Link key={i} to={s.to} className={className}>
                                {inner}
                            </Link>
                        ) : (
                            <div key={i} className={className}>
                                {inner}
                            </div>
                        )
                    })}
                </div>
            </div>

            <button
                type="button"
                onClick={onSignOut}
                title={onSignOut ? "Sign out" : undefined}
                style={{ font: "inherit" }}
                className={`mt-auto flex w-full items-center gap-2.5 rounded-xl border-none bg-bg-sunken px-2.5 py-2 text-left ${
                    onSignOut ? "cursor-pointer" : "cursor-default"
                }`}
            >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-lime text-[13px] font-semibold text-ink">
                    L
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">
                        Lukas Kroon
                    </div>
                    <div className="text-[11px] text-ink-3">
                        lukas · streak 23d
                    </div>
                </div>
                <span className="text-[12px] text-ink-3">⌄</span>
            </button>
        </aside>
    )
}
