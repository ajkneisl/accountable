// The heart of a competition: a standings leaderboard answering "who's hitting
// their goals?", plus a per-goal breakdown showing every member's progress toward
// each shared goal for one Monday-anchored week (with prev/next week navigation).

import { useEffect, useState } from "react"
import {
    type CompetitionDetail,
    type CompetitionGoalBoard,
    type CompetitionWeek,
    getCompetitionWeek,
    removeCompetitionGoal,
    useApi
} from "@shared/index"
import {
    dayOfIsoWeek,
    formatWeekRange,
    integrationVisual,
    unitLabel
} from "../../dashboard/types"
import { FALLBACK_BAR_COLOR } from "../colors"
import { AddCompetitionGoalDialog } from "./AddCompetitionGoalDialog"

/** Weekly-equivalent target the weekly total is measured against. */
function weeklyTarget(board: CompetitionGoalBoard): number {
    return board.period === "WEEKLY" ? board.target : board.target * 7
}

/**
 * The total a member must have reached *by now* to be "on pace":
 * - past weeks compare against the full weekly target
 * - the current week prorates it by how far into the week we are
 */
function paceTarget(board: CompetitionGoalBoard, currentWeek: boolean): number {
    const wt = weeklyTarget(board)
    return currentWeek ? (wt * dayOfIsoWeek()) / 7 : wt
}

function boardKey(b: { integration: string; metric: string; period: string }): string {
    return `${b.integration}:${b.metric}:${b.period}`
}

/** "5 commits / week" style label for a shared goal. */
function goalLabel(board: CompetitionGoalBoard): string {
    const unit = unitLabel(board.integration, board.metric)
    const cadence = board.period === "DAILY" ? "day" : "week"
    return `${board.target} ${unit} / ${cadence}`
}

type MemberStanding = {
    userID: string
    username: string
    streak: number
    color: string
    goalsHit: number
    /** Per-goal on-pace flags, in board order, for the segmented indicator. */
    hits: boolean[]
}

/** Rank members by goals-on-pace, then by streak — leader first. */
function computeStandings(
    competition: CompetitionDetail,
    week: CompetitionWeek,
    currentWeek: boolean,
    colors: Record<string, string>
): MemberStanding[] {
    return competition.members
        .map((m) => {
            const hits = week.goals.map((board) => {
                const mw = board.members.find((x) => x.userID === m.userID)
                return (mw?.total ?? 0) >= paceTarget(board, currentWeek)
            })
            return {
                userID: m.userID,
                username: m.username,
                streak: m.streak,
                color: colors[m.userID] ?? FALLBACK_BAR_COLOR,
                goalsHit: hits.filter(Boolean).length,
                hits
            }
        })
        .sort((a, b) => b.goalsHit - a.goalsHit || b.streak - a.streak)
}

const MEDAL = ["var(--lime)", "oklch(0.78 0.07 80)", "var(--coral)"]

function Standings({
    standings,
    goalCount,
    meID
}: {
    standings: MemberStanding[]
    goalCount: number
    meID?: string
}) {
    return (
        <div className="flex flex-col">
            {/* Column headers — clarify what the segments and number mean. */}
            <div className="flex items-center gap-3.5 px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.06em] text-ink-3">
                <div className="w-7" />
                <div className="w-2.5" />
                <div className="flex-1">Member</div>
                <div className="w-[120px] text-right">Goals on pace</div>
                <div className="w-16 text-right">Streak</div>
            </div>

            {standings.map((s, i) => {
                const isMe = s.userID === meID
                const rankColor = MEDAL[i] ?? "transparent"
                return (
                    <div
                        key={s.userID}
                        className={`flex items-center gap-3.5 rounded-[12px] px-3 py-2.5 ${
                            isMe ? "bg-bg-sunken" : ""
                        }`}
                    >
                        {/* Rank */}
                        <div className="flex w-7 items-center justify-center">
                            <span
                                className="grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold"
                                style={{
                                    background: i < 3 ? rankColor : "var(--bg-sunken)",
                                    color: i < 3 ? "var(--ink)" : "var(--ink-3)"
                                }}
                            >
                                {i + 1}
                            </span>
                        </div>

                        {/* Identity */}
                        <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: s.color }}
                        />
                        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                            {s.username}
                            {isMe && (
                                <span className="ml-1.5 text-[11px] font-normal text-ink-3">
                                    you
                                </span>
                            )}
                        </div>

                        {/* Goals-on-pace: segmented indicator + count */}
                        <div className="flex w-[120px] items-center justify-end gap-2.5">
                            {goalCount > 0 ? (
                                <>
                                    <div className="flex gap-1">
                                        {s.hits.map((hit, gi) => (
                                            <span
                                                key={gi}
                                                className="h-2 w-4 rounded-full"
                                                style={{
                                                    background: hit
                                                        ? "var(--lime)"
                                                        : "var(--line)"
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="mono text-[13px] tabular-nums">
                                        <span className="font-bold">
                                            {s.goalsHit}
                                        </span>
                                        <span className="text-ink-3">
                                            /{goalCount}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <span className="text-[12px] text-ink-3">—</span>
                            )}
                        </div>

                        {/* Streak */}
                        <div className="mono w-16 text-right text-[13px] tabular-nums text-ink-3">
                            <span className="font-bold text-ink">{s.streak}</span>
                            <span className="ml-0.5">d</span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function GoalProgress({
    board,
    currentWeek,
    meID,
    colors,
    onRemove,
    removing
}: {
    board: CompetitionGoalBoard
    currentWeek: boolean
    meID?: string
    colors: Record<string, string>
    onRemove?: () => void
    removing?: boolean
}) {
    const visual = integrationVisual(board.integration)
    const unit = unitLabel(board.integration, board.metric)
    const wt = weeklyTarget(board)
    const pace = paceTarget(board, currentWeek)
    const pacePct = Math.min(100, (pace / wt) * 100)
    const members = [...board.members].sort((a, b) => b.total - a.total)

    return (
        <div className="py-5 first:pt-0 last:pb-0">
            <div className="mb-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div
                        className={`source-tile is-sm ${visual.tile ? "tile-" + visual.tile : ""}`}
                    >
                        <span>{visual.glyph}</span>
                    </div>
                    <div>
                        <div className="text-[14px] font-semibold">
                            {goalLabel(board)}
                        </div>
                        <div className="text-[11px] text-ink-3">
                            {visual.sourceLabel} · {wt} {unit} this week
                        </div>
                    </div>
                </div>
                {onRemove && (
                    <button
                        type="button"
                        aria-label="Remove goal"
                        onClick={onRemove}
                        disabled={removing}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[16px] text-ink-3 hover:bg-bg-sunken disabled:opacity-40"
                    >
                        ×
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-2.5">
                {members.map((m) => {
                    const isMe = m.userID === meID
                    const color = colors[m.userID] ?? FALLBACK_BAR_COLOR
                    const onPace = m.total >= pace
                    const pct = Math.min(100, (m.total / wt) * 100)
                    return (
                        <div key={m.userID} className="flex items-center gap-3">
                            <div className="flex w-28 min-w-0 items-center gap-2">
                                <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ background: color }}
                                />
                                <span className="truncate text-[13px] font-medium">
                                    {m.username}
                                    {isMe && (
                                        <span className="ml-1 text-[10px] text-ink-3">
                                            you
                                        </span>
                                    )}
                                </span>
                            </div>

                            {/* Progress toward the weekly target, with a pace marker. */}
                            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                                <div
                                    className="h-full rounded-full transition-[width] duration-300"
                                    style={{ width: `${pct}%`, background: color }}
                                />
                                <div
                                    className="absolute top-0 h-full w-px bg-ink-3 opacity-50"
                                    style={{ left: `${pacePct}%` }}
                                    title={`On-pace mark: ${Math.round(pace)} ${unit}`}
                                />
                            </div>

                            <div className="mono w-16 text-right text-[12px] tabular-nums">
                                <span className="font-bold">{m.total}</span>
                                <span className="text-ink-3">/{wt}</span>
                            </div>

                            <span
                                className={`w-[68px] text-right text-[11px] font-semibold ${
                                    onPace ? "text-lime-ink" : "text-coral-ink"
                                }`}
                            >
                                {onPace ? "on pace" : "behind"}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export function CompetitionBoard({
    competition,
    isOwner,
    meID,
    colors,
    refreshKey = 0,
    onChanged
}: {
    competition: CompetitionDetail
    isOwner: boolean
    meID?: string
    colors: Record<string, string>
    /** Bump to refetch — e.g. after the owner adds or removes a shared goal. */
    refreshKey?: number
    onChanged: () => void
}) {
    const api = useApi()
    const [offset, setOffset] = useState(0)
    const [week, setWeek] = useState<CompetitionWeek | null>(null)
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [removing, setRemoving] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getCompetitionWeek(api, competition.id, offset)
            .then((w) => {
                if (!cancelled) setWeek(w)
            })
            .catch(() => {
                if (!cancelled) setWeek(null)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [api, competition.id, offset, refreshKey])

    async function remove(board: CompetitionGoalBoard) {
        if (!window.confirm(`Remove "${goalLabel(board)}" from this competition?`))
            return
        setError(null)
        setRemoving(boardKey(board))
        try {
            await removeCompetitionGoal(
                api,
                competition.id,
                board.integration,
                board.metric,
                board.period
            )
            onChanged()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove goal")
        } finally {
            setRemoving(null)
        }
    }

    const currentWeek = offset === 0
    const goalCount = week?.goals.length ?? 0
    const standings =
        week && week.goals.length > 0
            ? computeStandings(competition, week, currentWeek, colors)
            : null

    return (
        <div className="flex flex-col gap-4">
            {/* Standings — the at-a-glance "who's winning". */}
            <div className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div className="eyebrow">STANDINGS</div>
                    <div className="text-[11px] text-ink-3">
                        ranked by goals on pace
                    </div>
                </div>
                {standings ? (
                    <Standings
                        standings={standings}
                        goalCount={goalCount}
                        meID={meID}
                    />
                ) : (
                    <div className="text-[13px] text-ink-3">
                        {loading
                            ? "Loading…"
                            : "Add a shared goal below to start ranking members."}
                    </div>
                )}
            </div>

            {/* Per-goal progress breakdown. */}
            <div className="card p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="eyebrow">SHARED GOALS</div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-ink-3">
                            <button
                                type="button"
                                aria-label="Previous week"
                                onClick={() => setOffset((o) => o + 1)}
                                className="rounded px-1.5 text-sm hover:text-ink-1"
                            >
                                ‹
                            </button>
                            <span className="mono whitespace-nowrap text-[11px]">
                                {currentWeek
                                    ? "This week"
                                    : week
                                      ? formatWeekRange(week.weekStart)
                                      : "—"}
                            </span>
                            <button
                                type="button"
                                aria-label="Next week"
                                onClick={() => setOffset((o) => Math.max(0, o - 1))}
                                disabled={currentWeek}
                                className="rounded px-1.5 text-sm enabled:hover:text-ink-1 disabled:opacity-30"
                            >
                                ›
                            </button>
                        </div>
                        {isOwner && (
                            <button
                                type="button"
                                onClick={() => setAdding(true)}
                                className="btn btn-line btn-sm"
                            >
                                + Add goal
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-3 rounded-[10px] bg-coral-soft p-3 text-xs text-coral-ink">
                        {error}
                    </div>
                )}

                {!week || week.goals.length === 0 ? (
                    <div className="text-[13px] text-ink-3">
                        {loading
                            ? "Loading…"
                            : isOwner
                              ? "No goals yet. Add one to start the competition."
                              : "No goals yet. The owner can add them."}
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-line-2">
                        {week.goals.map((board) => (
                            <GoalProgress
                                key={boardKey(board)}
                                board={board}
                                currentWeek={currentWeek}
                                meID={meID}
                                colors={colors}
                                onRemove={
                                    isOwner ? () => remove(board) : undefined
                                }
                                removing={removing === boardKey(board)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {adding && (
                <AddCompetitionGoalDialog
                    competitionId={competition.id}
                    onClose={() => setAdding(false)}
                    onAdded={onChanged}
                />
            )}
        </div>
    )
}
