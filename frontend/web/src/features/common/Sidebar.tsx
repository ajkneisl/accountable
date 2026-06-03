// App shell sidebar — shared by Dashboard and Competition.

import { Link } from "react-router-dom"
import type {
    CompetitionSummary,
    Goal,
    SelfResponse
} from "@shared/index"
import {
    goalTitle,
    integrationVisual,
    isOnTrack
} from "../dashboard/types"
import { AccLogo, SourceTile } from "./primitives"

function GoalItem({ goal }: { goal: Goal }) {
    const visual = integrationVisual(goal.integration)
    const onTrack = isOnTrack(goal)
    const done = goal.progress >= goal.target

    let sub: string
    let tone: string
    if (done) {
        sub = `${goal.progress} / ${goal.target} · done ✓`
        tone = "text-lime-ink"
    } else if (!onTrack) {
        sub = `${goal.progress} / ${goal.target} · behind`
        tone = "text-coral-ink"
    } else {
        sub = `${goal.progress} / ${goal.target} · ${
            goal.period === "DAILY" ? "today" : "this week"
        }`
        tone = "text-ink-3"
    }

    return (
        <div className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2">
            <SourceTile label={visual.glyph} variant={visual.tile} />
            <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">
                    {goalTitle(goal)}
                </div>
                <div className={`truncate text-[11px] ${tone}`}>{sub}</div>
            </div>
        </div>
    )
}

function CompetitionItem({ comp }: { comp: CompetitionSummary }) {
    return (
        <Link
            to="/competition"
            className="flex items-center gap-3 px-2.5 py-2 text-inherit no-underline"
        >
            <div
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--ink)" }}
            />
            <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">
                    {comp.name}
                </div>
                <div className="truncate text-[11px] text-ink-3">
                    code · {comp.joinCode}
                </div>
            </div>
        </Link>
    )
}

export function Sidebar({
    onSignOut,
    user,
    goals,
    streak,
    competitions
}: {
    onSignOut?: () => void
    user: SelfResponse | null
    goals: Goal[]
    streak: number
    competitions: CompetitionSummary[]
}) {
    const initial = (user?.username[0] ?? "?").toUpperCase()
    const displayName = user?.username ?? "Signed out"

    return (
        <aside className="flex w-[280px] flex-col gap-7 border-r border-line-2 bg-bg px-5 py-6">
            <Link to="/dashboard" className="text-inherit no-underline">
                <AccLogo size={16} />
            </Link>

            <div>
                <div className="eyebrow mb-3">MY GOALS</div>
                <div className="flex flex-col gap-1">
                    {goals.length === 0 ? (
                        <div className="px-2.5 py-2 text-[12px] text-ink-3">
                            No goals yet.
                        </div>
                    ) : (
                        goals.map((g) => (
                            <GoalItem
                                key={`${g.integration}:${g.metric}:${g.period}`}
                                goal={g}
                            />
                        ))
                    )}
                    <Link
                        to="/onboarding"
                        className="btn btn-line btn-sm mt-1.5 justify-start"
                    >
                        + New goal
                    </Link>
                </div>
            </div>

            <div>
                <div className="eyebrow mb-3">COMPETITIONS</div>
                <div className="flex flex-col gap-1">
                    {competitions.length === 0 ? (
                        <div className="px-2.5 py-2 text-[12px] text-ink-3">
                            None yet.
                        </div>
                    ) : (
                        competitions.map((c) => (
                            <CompetitionItem key={c.id} comp={c} />
                        ))
                    )}
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
                    {initial}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">
                        {displayName}
                    </div>
                    <div className="text-[11px] text-ink-3">
                        streak {streak}d
                    </div>
                </div>
                <span className="text-[12px] text-ink-3">⌄</span>
            </button>
        </aside>
    )
}
