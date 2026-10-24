// A read-only competition: the standings ("who's winning?") beside every shared
// goal's per-member progress for the current week. [split] lays the two cards
// side by side at full height for the full-screen widget.

import type {
    CompetitionGoalBoard,
    CompetitionMemberWeek
} from "@shared/index"
import type { CompetitionView } from "../data"
import {
    formatAmount,
    formatWeekRange,
    goalKey,
    goalTitle,
    integrationVisual,
    paceStatus,
    unitLabel,
    weeklyTarget
} from "../format"
import {
    FALLBACK_BAR_COLOR,
    MEDAL,
    type MemberStanding,
    buildColorMap,
    computeStandings,
    displayValue,
    paceTarget
} from "../standings"
import { Badge, Dot } from "./primitives"

const STATUS_LABEL = { onTrack: "on pace", atRisk: "at risk", behind: "behind" }

const STATUS_CLASS = {
    onTrack: "text-lime-ink",
    atRisk: "text-ink-2",
    behind: "text-coral-ink"
}

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
        <div>
            <div className="flex items-center gap-[0.85em] px-[0.6em] pb-[0.6em] text-[0.85em] font-medium text-ink-3">
                <div className="w-[2em]" />
                <div className="flex-1">Member</div>
                <div>On pace</div>
                <div className="w-[3.5em] text-right">Streak</div>
            </div>

            {standings.map((s, i) => (
                <div
                    key={s.userID}
                    className={`flex items-center gap-[0.85em] rounded-[0.85em] px-[0.6em] py-[0.7em] ${
                        s.userID === meID ? "bg-bg-sunken" : ""
                    }`}
                >
                    <div
                        className="flex h-[1.75em] w-[1.75em] shrink-0 items-center justify-center rounded-full text-[0.85em] font-bold"
                        style={{
                            background: i < 3 ? MEDAL[i] : "var(--bg-sunken)",
                            color: i < 3 ? "var(--ink)" : "var(--ink-3)"
                        }}
                    >
                        {i + 1}
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-[0.6em]">
                        <Dot color={s.color} size="0.75em" />
                        <span className="truncate text-[1.1em] font-semibold">
                            {s.username}
                        </span>
                        {s.userID === meID && (
                            <span className="text-[0.8em] text-ink-3">you</span>
                        )}
                    </div>

                    <div className="flex items-center gap-[0.6em]">
                        <div className="flex gap-[0.3em]">
                            {s.hits.map((hit, gi) => (
                                <span
                                    key={gi}
                                    className="h-[0.6em] w-[1em] rounded-full"
                                    style={{
                                        background: hit
                                            ? "var(--lime)"
                                            : "var(--line)"
                                    }}
                                />
                            ))}
                        </div>
                        <span className="mono text-[0.95em] text-ink-3">
                            <b className="text-ink">{s.goalsHit}</b>/{goalCount}
                        </span>
                    </div>

                    <div className="mono w-[3.5em] text-right text-[0.95em] text-ink-3">
                        <b className="text-ink">{s.streak}</b>d
                    </div>
                </div>
            ))}
        </div>
    )
}

function GoalProgress({
    board,
    meID,
    colorMap
}: {
    board: CompetitionGoalBoard
    meID?: string
    colorMap: Record<string, string>
}) {
    const visual = integrationVisual(board.integration)
    const unit = unitLabel(board.integration, board.metric)
    const wt = weeklyTarget(board)
    const pacePct = Math.min(100, (paceTarget(board) / Math.max(1, wt)) * 100)
    // Daily goals show today's amounts against the daily target; pace (the
    // status label) still scores the whole week.
    const daily = board.period === "DAILY"
    const shown = (m: CompetitionMemberWeek) => displayValue(board, m)
    const members = [...board.members].sort((a, b) => shown(b) - shown(a))
    const amount = (v: number) =>
        formatAmount(board.integration, board.metric, v)

    return (
        <div className="flex flex-col gap-[0.9em] py-[1.1em]">
            <div className="flex items-center gap-[0.7em]">
                <Badge glyph={visual.glyph} variant={visual.tile} small />
                <div className="min-w-0">
                    <div className="truncate font-semibold">
                        {goalTitle(board)}
                    </div>
                    <div className="text-[0.8em] text-ink-3">
                        {visual.sourceLabel} ·{" "}
                        {daily ? "today" : `${amount(wt)} ${unit} this week`}
                    </div>
                </div>
            </div>

            {members.map((m) => {
                const color = colorMap[m.userID] ?? FALLBACK_BAR_COLOR
                const status = paceStatus(m.total, wt)
                const pct = Math.min(
                    100,
                    (shown(m) / Math.max(1, board.target)) * 100
                )
                return (
                    <div
                        key={m.userID}
                        className="flex items-center gap-[0.75em]"
                    >
                        <div className="flex w-[9em] min-w-0 shrink-0 items-center gap-[0.5em]">
                            <Dot color={color} />
                            <span className="truncate text-[0.95em] font-medium">
                                {m.username}
                            </span>
                            {m.userID === meID && (
                                <span className="text-[0.75em] text-ink-3">
                                    you
                                </span>
                            )}
                        </div>
                        <div className="bar h-[0.85em] flex-1">
                            <i
                                style={{ width: `${pct}%`, background: color }}
                            />
                            {!daily && (
                                <div
                                    className="absolute inset-y-0 w-px bg-ink-3 opacity-50"
                                    style={{ left: `${pacePct}%` }}
                                />
                            )}
                        </div>
                        <span className="mono w-[5.5em] text-right text-[0.85em] text-ink-3">
                            <b className="text-ink">{amount(shown(m))}</b>/
                            {amount(board.target)}
                        </span>
                        <span
                            className={`w-[4.5em] text-right text-[0.8em] font-semibold ${STATUS_CLASS[status]}`}
                        >
                            {STATUS_LABEL[status]}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

export function CompetitionBoard({
    competition: { detail, week },
    meID,
    split = false
}: {
    competition: CompetitionView
    meID?: string
    split?: boolean
}) {
    const colorMap = buildColorMap(detail.members.map((m) => m.userID))
    const standings =
        week.goals.length > 0 ? computeStandings(detail, week, colorMap) : null
    const card = `card p-[1.4em] ${split ? "min-h-0 overflow-hidden" : ""}`

    return (
        <div
            className={
                split
                    ? "grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-[1.4em]"
                    : "grid grid-cols-1 gap-[1.1em] lg:grid-cols-2"
            }
        >
            <div className={card}>
                <div className="mb-[1em] flex items-center justify-between">
                    <span className="eyebrow text-[0.85em]">Standings</span>
                    <span className="text-[0.8em] text-ink-3">
                        ranked by goals on pace
                    </span>
                </div>
                {standings ? (
                    <Standings
                        standings={standings}
                        goalCount={week.goals.length}
                        meID={meID}
                    />
                ) : (
                    <p className="m-0 text-ink-3">
                        No shared goals yet, so nobody&apos;s ranked.
                    </p>
                )}
            </div>

            <div className={card}>
                <div className="flex items-center justify-between">
                    <span className="eyebrow text-[0.85em]">Shared goals</span>
                    <span className="mono text-[0.8em] text-ink-3">
                        {formatWeekRange(week.weekStart)}
                    </span>
                </div>
                {week.goals.length === 0 ? (
                    <p className="mb-0 mt-[1em] text-ink-3">No goals yet.</p>
                ) : (
                    week.goals.map((board, i) => (
                        <div
                            key={goalKey(board)}
                            className={i > 0 ? "border-t border-line-2" : ""}
                        >
                            <GoalProgress
                                board={board}
                                meID={meID}
                                colorMap={colorMap}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
