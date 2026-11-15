// A read-only competition, in the app's three parts: this week's standings
// ("who's winning?"), the all-time leaderboard (weeks finished first), and a
// card per shared goal with every member's progress for the current week.
// [split] lays the rankings and the goals side by side at full height for the
// full-screen widget.

import type { ReactNode } from "react"
import type {
    CompetitionGoalBoard,
    CompetitionLeaderboard,
    CompetitionMemberWeek
} from "@shared/index"
import type { CompetitionView } from "../data"
import {
    formatAmount,
    formatWeekRange,
    goalKey,
    goalTitle,
    integrationVisual,
    streakText,
    weeklyTarget
} from "../format"
import {
    FALLBACK_BAR_COLOR,
    type MemberStanding,
    buildColorMap,
    computeStandings,
    displayValue,
    onMemberFill,
    paceTarget
} from "../standings"
import { Badge, PaceTick } from "./primitives"

/**
 * One member's row on a ranking: their rank in their own color, their name
 * with a value at the right, and a second line underneath for whatever the
 * ranking measures them by.
 */
function MemberRow({
    rank,
    color,
    username,
    isMe,
    divided,
    value,
    children
}: {
    rank: number
    color: string
    username: string
    isMe: boolean
    /** Rules the row off from the one above it. */
    divided: boolean
    value: ReactNode
    children: ReactNode
}) {
    return (
        <div
            className={`flex items-center gap-[1em] px-[1.4em] py-[0.95em] ${
                divided ? "border-t border-line-2" : ""
            } ${isMe ? "bg-bg-sunken" : ""}`}
        >
            <div
                className="flex h-[2.2em] w-[2.2em] shrink-0 items-center justify-center rounded-full font-bold"
                style={{ background: color, color: onMemberFill(color) }}
            >
                {rank}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[0.45em]">
                <div className="flex items-center gap-[0.6em]">
                    <span className="truncate text-[1.1em] font-semibold">
                        {username}
                    </span>
                    {isMe && (
                        <span className="text-[0.8em] text-ink-3">you</span>
                    )}
                    <span className="mono ml-auto shrink-0 text-[0.95em] text-ink-3">
                        {value}
                    </span>
                </div>
                {children}
            </div>
        </div>
    )
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
        <>
            {standings.map((s, i) => (
                <MemberRow
                    key={s.userID}
                    rank={i + 1}
                    color={s.color}
                    username={s.username}
                    isMe={s.userID === meID}
                    divided={i > 0}
                    value={
                        <>
                            <b className="text-ink">{s.goalsHit}</b>/{goalCount}
                        </>
                    }
                >
                    <div className="flex items-center justify-between gap-[0.6em]">
                        <span className="text-[0.85em] text-ink-3">
                            {streakText(s.streak)}
                        </span>
                        {/* One segment per shared goal, in the goals' order. */}
                        <div className="flex gap-[0.3em]">
                            {s.hits.map((hit, gi) => (
                                <span
                                    key={gi}
                                    className="h-[0.6em] w-[1.3em] rounded-full"
                                    style={{
                                        background: hit
                                            ? s.color
                                            : "var(--line)"
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </MemberRow>
            ))}
        </>
    )
}

type LeaderboardEntry = CompetitionLeaderboard["members"][number]

/** How many members can stand on the podium. */
const PODIUM_PLACES = 3

/**
 * A podium block's height by rank rather than by position, so members level on
 * weeks stand level.
 */
const BLOCK_HEIGHT: Record<number, string> = {
    1: "5.6em",
    2: "4em",
    3: "2.8em"
}

/** One member on the podium: their name and weeks over a block in their color. */
function PodiumPlace({
    entry,
    rank,
    color,
    isMe
}: {
    entry: LeaderboardEntry
    rank: number
    color: string
    isMe: boolean
}) {
    const first = rank === 1
    return (
        <div className="flex min-w-0 max-w-[11em] flex-1 flex-col items-center">
            <span
                className={`max-w-full truncate font-semibold ${
                    first ? "text-[1.25em]" : "text-[1.05em]"
                }`}
            >
                {entry.username}
            </span>
            <span className="mono text-[0.85em] text-ink-3">
                <b
                    className={`text-ink ${
                        first ? "text-[2em]" : "text-[1.5em]"
                    }`}
                >
                    {entry.weeksWon}
                </b>
                {entry.weeksWon === 1 ? " wk" : " wks"}
            </span>
            <div
                className="mt-[0.5em] flex w-full flex-col items-center rounded-t-[0.7em] pt-[0.45em] leading-none"
                style={{
                    height: BLOCK_HEIGHT[rank] ?? BLOCK_HEIGHT[3],
                    background: color,
                    color: onMemberFill(color)
                }}
            >
                <span
                    className={`font-bold ${
                        first ? "text-[1.7em]" : "text-[1.35em]"
                    }`}
                >
                    {rank}
                </span>
                {isMe && (
                    <span className="mt-[0.35em] text-[0.75em] opacity-70">
                        you
                    </span>
                )}
            </div>
        </div>
    )
}

/**
 * Weeks each member has finished first: the top three on a podium, then
 * everyone else with their share of the weeks counted.
 */
function Leaderboard({
    board,
    colorMap,
    meID
}: {
    board: CompetitionLeaderboard
    colorMap: Record<string, string>
    meID?: string
}) {
    // Members level on weeks share a rank.
    const rankOf = (m: LeaderboardEntry) =>
        1 + board.members.filter((o) => o.weeksWon > m.weeksWon).length
    // Only members who've won a week stand on the podium, so nobody's up there
    // on nothing. The list arrives sorted by weeks won.
    const podium = board.members
        .filter((m) => m.weeksWon > 0)
        .slice(0, PODIUM_PLACES)
    const rest = board.members.slice(podium.length)
    // First in the middle once all three places are taken.
    const placed =
        podium.length === PODIUM_PLACES
            ? [podium[1], podium[0], podium[2]]
            : podium

    return (
        <>
            {placed.length > 0 && (
                <div className="flex shrink-0 items-end justify-center gap-[0.9em] px-[1.4em] pt-[0.8em]">
                    {placed.map((m) => (
                        <PodiumPlace
                            key={m.userID}
                            entry={m}
                            rank={rankOf(m)}
                            color={colorMap[m.userID] ?? FALLBACK_BAR_COLOR}
                            isMe={m.userID === meID}
                        />
                    ))}
                </div>
            )}
            {rest.map((m, i) => {
                const color = colorMap[m.userID] ?? FALLBACK_BAR_COLOR
                const isMe = m.userID === meID
                return (
                    <MemberRow
                        key={m.userID}
                        rank={rankOf(m)}
                        color={color}
                        username={m.username}
                        isMe={isMe}
                        // The first row is ruled off from the podium above it.
                        divided={i > 0 || placed.length > 0}
                        value={
                            <>
                                <b className="text-ink">{m.weeksWon}</b>
                                {m.weeksWon === 1 ? " wk" : " wks"}
                            </>
                        }
                    >
                        <div
                            className="bar h-[0.55em]"
                            // The highlighted row is already the track color.
                            style={
                                isMe ? { background: "var(--line)" } : undefined
                            }
                        >
                            <i
                                style={{
                                    width: `${
                                        board.weeks > 0
                                            ? (m.weeksWon / board.weeks) * 100
                                            : 0
                                    }%`,
                                    background: color
                                }}
                            />
                        </div>
                    </MemberRow>
                )
            })}
        </>
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
    const wt = weeklyTarget(board)
    const pace = paceTarget(board)
    const pacePct = Math.min(100, (pace / Math.max(1, wt)) * 100)
    const daily = board.period === "DAILY"
    const shown = (m: CompetitionMemberWeek) => displayValue(board, m)
    const members = [...board.members].sort((a, b) => shown(b) - shown(a))
    const amount = (v: number) =>
        formatAmount(board.integration, board.metric, v)

    return (
        <div className="card flex flex-col gap-[1em] p-[1.4em]">
            <div className="flex items-center gap-[0.85em]">
                <Badge integration={board.integration} />
                <div className="min-w-0">
                    <div className="truncate text-[1.15em] font-semibold tracking-[-0.01em]">
                        {goalTitle(board)}
                    </div>
                    <div className="text-[0.85em] text-ink-3">
                        {visual.sourceLabel}
                    </div>
                </div>
            </div>

            {members.map((m) => {
                const color = colorMap[m.userID] ?? FALLBACK_BAR_COLOR
                const pct = Math.min(
                    100,
                    (shown(m) / Math.max(1, board.target)) * 100
                )
                return (
                    <div
                        key={m.userID}
                        className="flex items-center gap-[0.75em]"
                    >
                        <div className="flex w-[6em] min-w-0 shrink-0 items-center gap-[0.5em] sm:w-[9em]">
                            <span className="truncate text-[0.95em] font-medium">
                                {m.username}
                            </span>
                            {m.userID === meID && (
                                <span className="text-[0.75em] text-ink-3">
                                    you
                                </span>
                            )}
                        </div>
                        <div className="bar h-[0.75em] flex-1">
                            <i
                                style={{ width: `${pct}%`, background: color }}
                            />
                            {/* Weekly goals mark where the week should be by now. */}
                            {!daily && (
                                <PaceTick
                                    at={pacePct}
                                    filled={pct >= pacePct}
                                    on={onMemberFill(color)}
                                />
                            )}
                        </div>
                        <span className="mono w-[5.5em] text-right text-[0.85em] text-ink-3">
                            <b className="text-ink">{amount(shown(m))}</b>/
                            {amount(board.target)}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

/** A ranking's card: a small heading, then its rows edge to edge. */
function RankingCard({
    title,
    note,
    className = "",
    children
}: {
    title: string
    /** Shown beside the title, e.g. what the counts are out of. */
    note?: string
    className?: string
    children: ReactNode
}) {
    return (
        <div className={`card flex flex-col overflow-hidden ${className}`}>
            <div className="flex items-center justify-between gap-[1em] px-[1.4em] pb-[0.5em] pt-[1.1em]">
                <span className="eyebrow text-[0.85em]">{title}</span>
                {note && (
                    <span className="mono text-[0.8em] text-ink-3">{note}</span>
                )}
            </div>
            {children}
        </div>
    )
}

export function CompetitionBoard({
    competition: { detail, week, leaderboard },
    meID,
    split = false
}: {
    competition: CompetitionView
    meID?: string
    split?: boolean
}) {
    const colorMap = buildColorMap(detail.members)
    const standings =
        week.goals.length > 0 ? computeStandings(detail, week, colorMap) : null
    // Full screen, a ranking takes its share of the height and clips the rest.
    const ranking = split ? "min-h-0" : ""

    return (
        <div
            className={
                split
                    ? "grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-[1.4em] portrait:grid-cols-1 portrait:grid-rows-[minmax(0,1fr)_minmax(0,1.35fr)]"
                    : "grid grid-cols-1 gap-[1.1em] lg:grid-cols-2"
            }
        >
            <div
                className={`flex flex-col ${
                    split ? "min-h-0 gap-[1.4em]" : "gap-[1.1em]"
                }`}
            >
                <RankingCard
                    title="This week"
                    note={formatWeekRange(week.weekStart)}
                    className={`${ranking} ${split ? "flex-[1.2]" : ""}`}
                >
                    {standings ? (
                        <Standings
                            standings={standings}
                            goalCount={week.goals.length}
                            meID={meID}
                        />
                    ) : (
                        <p className="m-0 px-[1.4em] pb-[1.2em] text-ink-3">
                            No shared goals yet, so nobody&apos;s ranked.
                        </p>
                    )}
                </RankingCard>

                {/* Left out when it couldn't be loaded, or nothing's counted yet. */}
                {leaderboard && leaderboard.weeks > 0 && (
                    <RankingCard
                        title="All time"
                        note={`weeks first, of ${leaderboard.weeks}`}
                        className={`${ranking} ${split ? "flex-1" : ""}`}
                    >
                        <Leaderboard
                            board={leaderboard}
                            colorMap={colorMap}
                            meID={meID}
                        />
                    </RankingCard>
                )}
            </div>

            <div
                className={`flex flex-col ${
                    split
                        ? "min-h-0 gap-[1.4em] overflow-hidden"
                        : "gap-[1.1em]"
                }`}
            >
                {week.goals.length === 0 ? (
                    <div className="card p-[1.4em]">
                        <p className="m-0 text-ink-3">No shared goals yet.</p>
                    </div>
                ) : (
                    week.goals.map((board) => (
                        <GoalProgress
                            key={goalKey(board)}
                            board={board}
                            meID={meID}
                            colorMap={colorMap}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
