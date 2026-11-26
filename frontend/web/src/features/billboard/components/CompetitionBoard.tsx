// A read-only competition, in the app's three parts: this week's standings
// ("who's winning?"), the all-time leaderboard (weeks finished first), and a
// card per shared goal with every member's progress for the current week.
// [split] lays the rankings and the goals side by side at full height for the
// full-screen widget.

import type { ReactNode } from "react"
import type {
    CompetitionGoalBoard,
    CompetitionLeaderboard
} from "@shared/index"
import type { CompetitionView } from "../data"
import {
    formatAmount,
    formatWeekRange,
    goalKey,
    goalTitle,
    integrationVisual,
    localWeekday,
    streakText
} from "../format"
import {
    FALLBACK_BAR_COLOR,
    type DayState,
    type MemberStanding,
    buildColorMap,
    computeStandings,
    dayStates,
    memberOnPace,
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

/** How many members are picked out above the list. */
const TOP_PLACES = 3

const ORDINAL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" }

/**
 * One of the top three: their profile circle with the place they hold on its
 * lower edge, then their name and weeks. The circle is sized by rank rather
 * than by position, so members level on weeks look level.
 */
function TopPlace({
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
    const size = first ? "4.6em" : "3.4em"
    return (
        <div className="flex min-w-0 max-w-[11em] flex-1 flex-col items-center">
            <div
                className="flex shrink-0 items-center justify-center rounded-full font-bold leading-none"
                style={{
                    width: size,
                    height: size,
                    background: color,
                    color: onMemberFill(color)
                }}
            >
                <span className={first ? "text-[1.9em]" : "text-[1.4em]"}>
                    {(entry.username[0] ?? "?").toUpperCase()}
                </span>
            </div>
            {/* Ringed in the card's color, so it reads against the circle. */}
            <span className="mt-[-0.95em] rounded-full border-[0.2em] border-bg-card bg-ink px-[0.7em] py-[0.15em] text-[0.7em] font-bold text-bg-card">
                {ORDINAL[rank] ?? rank}
            </span>
            <span
                className={`mt-[0.3em] flex max-w-full items-baseline gap-[0.4em] font-semibold ${
                    first ? "text-[1.2em]" : "text-[1.05em]"
                }`}
            >
                <span className="truncate">{entry.username}</span>
                {isMe && (
                    <span className="shrink-0 text-[0.7em] font-normal text-ink-3">
                        you
                    </span>
                )}
            </span>
            <span className="mono text-[0.85em] text-ink-3">
                <b
                    className={`text-ink ${
                        first ? "text-[1.6em]" : "text-[1.3em]"
                    }`}
                >
                    {entry.weeksWon}
                </b>
                {entry.weeksWon === 1 ? " wk" : " wks"}
            </span>
        </div>
    )
}

/**
 * Weeks each member has finished first: the top three picked out by their
 * profile circles, then everyone else with their share of the weeks counted.
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
    // Only members who've won a week are picked out, so nobody's up there on
    // nothing. The list arrives sorted by weeks won.
    const top = board.members
        .filter((m) => m.weeksWon > 0)
        .slice(0, TOP_PLACES)
    const rest = board.members.slice(top.length)
    // First in the middle once all three places are taken.
    const placed =
        top.length === TOP_PLACES ? [top[1], top[0], top[2]] : top

    return (
        <>
            {placed.length > 0 && (
                <div className="flex shrink-0 items-end justify-center gap-[0.9em] px-[1.4em] pb-[1em] pt-[0.8em]">
                    {placed.map((m) => (
                        <TopPlace
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
                        // The first row is ruled off from the top three above it.
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

/**
 * A member's week on a daily goal, one segment per day, Monday first: filled in
 * their color when the target was hit, coral when it was missed, today filling
 * as it goes, days to come faint.
 */
function DayStrip({
    states,
    vals,
    target,
    color
}: {
    states: DayState[]
    vals: number[]
    target: number
    color: string
}) {
    return (
        <div className="flex flex-1 gap-[0.25em]">
            {states.map((s, i) => {
                const fill =
                    s === "hit"
                        ? 100
                        : s === "pending"
                          ? Math.min(
                                100,
                                ((vals[i] ?? 0) / Math.max(1, target)) * 100
                            )
                          : 0
                return (
                    <div
                        key={i}
                        className="bar h-[0.75em] flex-1"
                        style={{
                            background:
                                s === "missed"
                                    ? "var(--coral-soft)"
                                    : undefined,
                            boxShadow:
                                s === "missed"
                                    ? "inset 0 0 0 1.5px var(--coral)"
                                    : undefined,
                            opacity:
                                s === "future"
                                    ? 0.5
                                    : s === "excluded"
                                      ? 0.25
                                      : 1
                        }}
                    >
                        {fill > 0 && (
                            <i
                                style={{ width: `${fill}%`, background: color }}
                            />
                        )}
                    </div>
                )
            })}
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
    const pace = paceTarget(board)
    const pacePct = Math.min(100, (pace / Math.max(1, board.target)) * 100)
    // A daily goal has to be hit every day, so its rows show each member's days.
    const daily = board.period === "DAILY"
    const rows = board.members.map((m) => {
        const states = daily ? dayStates(board, m) : null
        return {
            m,
            states,
            onPace: memberOnPace(board, m),
            daysHit: states?.filter((s) => s === "hit").length ?? 0,
            counted: states?.filter((s) => s !== "excluded").length ?? 0
        }
    })
    // Days: on pace first, then most days hit, then furthest along today.
    const today = localWeekday()
    rows.sort((a, b) =>
        daily
            ? Number(b.onPace) - Number(a.onPace) ||
              b.daysHit - a.daysHit ||
              (b.m.vals[today] ?? 0) - (a.m.vals[today] ?? 0)
            : b.m.total - a.m.total
    )
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

            {rows.map(({ m, states, daysHit, counted }) => {
                const color = colorMap[m.userID] ?? FALLBACK_BAR_COLOR
                const pct = Math.min(
                    100,
                    (m.total / Math.max(1, board.target)) * 100
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
                        {states ? (
                            <DayStrip
                                states={states}
                                vals={m.vals}
                                target={board.target}
                                color={color}
                            />
                        ) : (
                            <div className="bar h-[0.75em] flex-1">
                                <i
                                    style={{
                                        width: `${pct}%`,
                                        background: color
                                    }}
                                />
                                {/* Weekly goals mark where the week should be by now. */}
                                <PaceTick
                                    at={pacePct}
                                    filled={pct >= pacePct}
                                    on={onMemberFill(color)}
                                />
                            </div>
                        )}
                        <span className="mono w-[5.5em] text-right text-[0.85em] text-ink-3">
                            {states ? (
                                <>
                                    <b className="text-ink">{daysHit}</b>/
                                    {counted} days
                                </>
                            ) : (
                                <>
                                    <b className="text-ink">
                                        {amount(m.total)}
                                    </b>
                                    /{amount(board.target)}
                                </>
                            )}
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
