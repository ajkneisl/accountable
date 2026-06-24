// Competition goals dashboard — a Monday–Sunday weekview showing, per shared goal,
// every member's daily progress and weekly total, with prev/next week navigation.

import { useEffect, useState } from "react"
import {
    type CompetitionGoalBoard,
    type CompetitionWeek,
    getCompetitionWeek,
    useApi
} from "@shared/index"
import { formatWeekRange, integrationVisual, unitLabel } from "../../dashboard/types"

const WEEKDAY = ["M", "T", "W", "T", "F", "S", "S"]

/** Per-day target a value must hit to count as "on pace" that day. */
function perDayTarget(board: CompetitionGoalBoard): number {
    return board.period === "WEEKLY" ? board.target / 7 : board.target
}

/** Weekly-equivalent target the weekly total is measured against. */
function weeklyTarget(board: CompetitionGoalBoard): number {
    return board.period === "WEEKLY" ? board.target : board.target * 7
}

function GoalBoard({
    board,
    meID
}: {
    board: CompetitionGoalBoard
    meID?: string
}) {
    const visual = integrationVisual(board.integration)
    const unit = unitLabel(board.integration, board.metric)
    const cadence = board.period === "DAILY" ? "day" : "week"
    const pdt = perDayTarget(board)
    const wt = weeklyTarget(board)
    const ranked = [...board.members].sort((a, b) => b.total - a.total)

    return (
        <div>
            <div className="mb-2.5 flex items-center gap-2.5">
                <div
                    className={`source-tile ${visual.tile ? "tile-" + visual.tile : ""}`}
                >
                    <span>{visual.glyph}</span>
                </div>
                <div className="text-[14px] font-semibold">
                    {board.target} {unit} / {cadence}
                </div>
            </div>

            <table className="w-full border-collapse text-[12px]">
                <thead>
                    <tr className="text-ink-3">
                        <th className="py-1 text-left font-normal">Member</th>
                        {WEEKDAY.map((d, i) => (
                            <th
                                key={i}
                                className="mono w-8 text-center font-normal"
                            >
                                {d}
                            </th>
                        ))}
                        <th className="mono w-12 text-right font-normal">Tot</th>
                    </tr>
                </thead>
                <tbody>
                    {ranked.map((m) => (
                        <tr key={m.userID} className="border-t border-line-2">
                            <td className="py-1.5 pr-2">
                                <span className="font-semibold">
                                    {m.username}
                                </span>
                                {m.userID === meID && (
                                    <span className="ml-1 text-[10px] text-ink-3">
                                        (you)
                                    </span>
                                )}
                            </td>
                            {m.vals.map((v, i) => (
                                <td key={i} className="py-1.5 text-center">
                                    <span
                                        className={`mono ${
                                            v >= pdt && v > 0
                                                ? "font-semibold text-lime-ink"
                                                : v > 0
                                                  ? "text-ink-2"
                                                  : "text-ink-3"
                                        }`}
                                    >
                                        {v === 0 ? "·" : v}
                                    </span>
                                </td>
                            ))}
                            <td
                                className={`mono py-1.5 text-right font-bold ${
                                    m.total >= wt ? "text-lime-ink" : ""
                                }`}
                            >
                                {m.total}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export function CompetitionGoalsWeek({
    competitionId,
    meID,
    refreshKey = 0
}: {
    competitionId: string
    meID?: string
    /** Bump to refetch — e.g. after the owner adds or removes a shared goal. */
    refreshKey?: number
}) {
    const api = useApi()
    const [offset, setOffset] = useState(0)
    const [week, setWeek] = useState<CompetitionWeek | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getCompetitionWeek(api, competitionId, offset)
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
    }, [api, competitionId, offset, refreshKey])

    return (
        <div className="card mt-4 p-6">
            <div className="mb-4 flex items-center justify-between">
                <div className="eyebrow">GOALS THIS WEEK</div>
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
                        {offset === 0
                            ? "This week"
                            : week
                              ? formatWeekRange(week.weekStart)
                              : "—"}
                    </span>
                    <button
                        type="button"
                        aria-label="Next week"
                        onClick={() => setOffset((o) => Math.max(0, o - 1))}
                        disabled={offset === 0}
                        className="rounded px-1.5 text-sm enabled:hover:text-ink-1 disabled:opacity-30"
                    >
                        ›
                    </button>
                </div>
            </div>

            {!week || week.goals.length === 0 ? (
                <div className="text-[13px] text-ink-3">
                    {loading ? "Loading…" : "No shared goals yet."}
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {week.goals.map((board) => (
                        <GoalBoard
                            key={`${board.integration}:${board.metric}:${board.period}`}
                            board={board}
                            meID={meID}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
