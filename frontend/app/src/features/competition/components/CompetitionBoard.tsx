// The heart of a competition, as two of the competition screen's pages: the
// standings, answering "who's hitting their goals?", and the shared goals, one
// card each, showing every member's progress toward it. Both show one
// Monday-anchored week, shared through useCompetitionWeek, named in a heading
// at the top of the page with the prev/next week control. The owner edits and adds shared goals
// from the goals page's edit mode, as on the Goals tab.
//
// Ported from the web board. The scoring is identical; the layout is restacked for
// a phone — each member's progress row puts the name/total above its bar instead
// of laying them out in one wide flex row.

import { type ReactNode, useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"
import {
    addCompetitionGoal,
    type CompetitionDetail,
    type CompetitionGoalBoard,
    type CompetitionMemberWeek,
    type CompetitionWeek,
    getCompetitionWeek,
    removeCompetitionGoal,
    useApi
} from "@shared/index"
import { useColors, useScheme } from "../../../theme"
import { WeekHeading } from "../../../ui/WeekHeading"
import {
    AddCard,
    Bar,
    Button,
    Card,
    IntegrationIcon,
    Mono,
    PaceTick,
    SourceTile
} from "../../../ui/primitives"
import { EditGoalSheet } from "../../dashboard/components/EditGoalSheet"
import {
    formatAmount,
    formatWeekRange,
    integrationVisual,
    localWeekday,
    localWeekStart,
    streakLabel,
    unitLabel
} from "../../dashboard/types"
import { FALLBACK_BAR_COLOR, onMemberFill } from "../colors"
import {
    computeStandings,
    type DayState,
    dayStates,
    memberOnPace,
    paceTarget
} from "../standings"
import { MemberRow } from "./MemberRow"

function boardKey(b: {
    integration: string
    metric: string
    period: string
}): string {
    return `${b.integration}:${b.metric}:${b.period}`
}

/** "5 commits / week" style label for a shared goal. */
function goalLabel(board: CompetitionGoalBoard): string {
    const unit = unitLabel(board.integration, board.metric)
    const cadence = board.period === "DAILY" ? "day" : "week"
    const target = formatAmount(board.integration, board.metric, board.target)
    const minimum = board.minWorkoutMin ? ` · ${board.minWorkoutMin}+ min` : ""
    return `${target} ${unit} / ${cadence}${minimum}`
}

const WEEKDAY = ["M", "T", "W", "T", "F", "S", "S"]
const WEEKDAY_NAME = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]
const DAY_MS = 86_400_000

/** "Tue, Nov 3" for a picked day. */
const DAY_FMT = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
})

/**
 * M T W T F S S chips that pick one day of the week for every shared goal at
 * once; tapping the picked day again returns to the whole week. Days still to
 * come can't be picked, nor can days from before the competition started.
 */
function DayPicker({
    selected,
    from,
    selectable,
    onSelect
}: {
    selected: number | null
    /** The first day that can be picked (0 = Monday). */
    from: number
    /** How many days, counted from Monday, have started. */
    selectable: number
    onSelect: (day: number | null) => void
}) {
    return (
        <View className="flex-row gap-1.5">
            {WEEKDAY.map((d, i) => {
                const picked = selected === i
                const future = i >= selectable || i < from
                return (
                    <Pressable
                        key={i}
                        disabled={future}
                        onPress={() => onSelect(picked ? null : i)}
                        accessibilityRole="button"
                        accessibilityState={{
                            selected: picked,
                            disabled: future
                        }}
                        accessibilityLabel={WEEKDAY_NAME[i]}
                        hitSlop={4}
                        className={`h-8 flex-1 items-center justify-center rounded-[9px] ${
                            picked ? "bg-ink" : "bg-bg-sunken"
                        } ${future ? "opacity-40" : ""}`}
                    >
                        <Mono
                            className={`text-[12px] font-semibold ${
                                picked ? "text-bg" : "text-ink-3"
                            }`}
                        >
                            {d}
                        </Mono>
                    </Pressable>
                )
            })}
        </View>
    )
}

/** "Tue, Nov 3" for day [day] (0 = Monday) of the week starting [weekStart]. */
function dayDate(weekStart: number, day: number): string {
    // Noon, so a DST change can't tip the label onto the neighbouring day.
    return DAY_FMT.format(new Date(weekStart + day * DAY_MS + DAY_MS / 2))
}

/** "Tuesday and Thursday" / "Monday, Tuesday and Friday". */
function listDays(days: number[]): string {
    const names = days.map((d) => WEEKDAY_NAME[d])
    return names.length < 2
        ? names.join("")
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

/**
 * A member's week on a daily goal, one segment per day, Monday first: filled
 * in their color when the target was hit, coral when it was missed. Today fills
 * as it goes. Days still to come are faint, and days before the member was in
 * the competition fainter still.
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
    const colors = useColors()
    const counted = states.filter((s) => s !== "excluded").length
    const hit = states.filter((s) => s === "hit").length
    const missed = states.flatMap((s, i) => (s === "missed" ? [i] : []))
    const label =
        `Hit ${hit} of ${counted} days` +
        (missed.length ? `, missed ${listDays(missed)}` : "")

    return (
        <View className="flex-row gap-1" accessible accessibilityLabel={label}>
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
                    <View
                        key={i}
                        style={{
                            flex: 1,
                            height: 10,
                            borderRadius: 5,
                            overflow: "hidden",
                            backgroundColor:
                                s === "missed"
                                    ? colors.coralSoft
                                    : colors.bgSunken,
                            borderWidth: s === "missed" ? 1.5 : 0,
                            borderColor: colors.coral,
                            opacity:
                                s === "future"
                                    ? 0.5
                                    : s === "excluded"
                                      ? 0.25
                                      : 1
                        }}
                    >
                        {fill > 0 && (
                            <View
                                style={{
                                    width: `${fill}%`,
                                    height: "100%",
                                    backgroundColor: color
                                }}
                            />
                        )}
                    </View>
                )
            })}
        </View>
    )
}

function GoalProgress({
    board,
    currentWeek,
    weekStart,
    day,
    meID,
    colorMap,
    onEdit
}: {
    board: CompetitionGoalBoard
    currentWeek: boolean
    /** Monday 00:00 (ms epoch) of the week shown. */
    weekStart: number
    /** The day picked for the whole page (0 = Monday), or null for the week. */
    day: number | null
    meID?: string
    colorMap: Record<string, string>
    /** Opens the edit sheet. Passed only while the page is in edit mode. */
    onEdit?: () => void
}) {
    const scheme = useScheme()
    const visual = integrationVisual(board.integration)
    const pace = paceTarget(board, currentWeek)
    const pacePct = Math.min(100, (pace / Math.max(1, board.target)) * 100)
    const daily = board.period === "DAILY"
    // A daily goal has to be hit every day, so its whole week shows each
    // member's days. A picked day shows that day's amount against the target.
    const dayView = daily && day === null
    const shown = (m: CompetitionMemberWeek) =>
        day !== null ? (m.vals[day] ?? 0) : m.total
    const rows = board.members.map((m) => {
        const states = dayView ? dayStates(board, m, currentWeek) : null
        return {
            m,
            states,
            onPace: memberOnPace(board, m, currentWeek),
            daysHit: states?.filter((s) => s === "hit").length ?? 0,
            counted: states?.filter((s) => s !== "excluded").length ?? 0
        }
    })
    // Days: on pace first, then most days hit, then furthest along today.
    const today = currentWeek ? localWeekday() : 6
    if (dayView)
        rows.sort(
            (a, b) =>
                Number(b.onPace) - Number(a.onPace) ||
                b.daysHit - a.daysHit ||
                (b.m.vals[today] ?? 0) - (a.m.vals[today] ?? 0)
        )
    else rows.sort((a, b) => shown(b.m) - shown(a.m))
    const amount = (v: number) =>
        formatAmount(board.integration, board.metric, v)
    // One day of a weekly goal has no target of its own, so its bars compare
    // members against that day's leader instead.
    const dayLeader = Math.max(1, ...board.members.map(shown))
    const barScale =
        day !== null && !daily ? dayLeader : Math.max(1, board.target)
    const showTarget = day === null || daily
    // Not while editing, where it would crowd the Edit button.
    const dayLabel = day !== null && !onEdit ? dayDate(weekStart, day) : null

    return (
        <View className="gap-5">
            <View className="flex-row items-center gap-3">
                <SourceTile
                    label={visual.glyph}
                    variant={visual.tile}
                    icon={<IntegrationIcon name={board.integration} />}
                />
                <View className="flex-1">
                    <Text className="text-base font-semibold tracking-tight text-ink">
                        {goalLabel(board)}
                    </Text>
                    <Text className="text-xs text-ink-3">
                        {visual.sourceLabel}
                    </Text>
                </View>
                {/* On each goal, so the rows still read as one day once the
                    page's picker has scrolled away. */}
                {dayLabel && (
                    <Mono className="text-[11px] text-ink-2">{dayLabel}</Mono>
                )}
                {onEdit && (
                    <Button
                        label="Edit"
                        variant="line"
                        size="sm"
                        onPress={onEdit}
                    />
                )}
            </View>

            <View className="gap-4">
                {rows.map(({ m, states, daysHit, counted }) => {
                    const isMe = m.userID === meID
                    const color = colorMap[m.userID] ?? FALLBACK_BAR_COLOR
                    const pct = Math.min(100, (shown(m) / barScale) * 100)
                    return (
                        <View key={m.userID} className="gap-2">
                            <View className="flex-row items-center gap-2">
                                <Text
                                    numberOfLines={1}
                                    className="flex-shrink text-[14px] font-medium text-ink"
                                >
                                    {m.username}
                                </Text>
                                {isMe && (
                                    <Text className="text-[11px] text-ink-3">
                                        you
                                    </Text>
                                )}
                                <View className="flex-1" />
                                <Mono className="text-[13px] text-ink-3">
                                    {states ? (
                                        <>
                                            <Text className="font-bold text-ink">
                                                {daysHit}
                                            </Text>
                                            {`/${counted} days`}
                                        </>
                                    ) : (
                                        <>
                                            <Text className="font-bold text-ink">
                                                {amount(shown(m))}
                                            </Text>
                                            {showTarget &&
                                                `/${amount(board.target)}`}
                                        </>
                                    )}
                                </Mono>
                            </View>

                            {states ? (
                                <DayStrip
                                    states={states}
                                    vals={m.vals}
                                    target={board.target}
                                    color={color}
                                />
                            ) : (
                                // Progress toward the target; weekly goals add a pace marker.
                                <Bar pct={pct} color={color} height={10}>
                                    {!daily && day === null && (
                                        <PaceTick
                                            at={pacePct}
                                            filled={pct >= pacePct}
                                            onFillColor={onMemberFill(
                                                color,
                                                scheme
                                            )}
                                        />
                                    )}
                                </Bar>
                            )}
                        </View>
                    )
                })}
            </View>
        </View>
    )
}

/**
 * The pages' week heading. Anything else that picks what a page shows — the
 * goals' day picker — goes under it as [children].
 */
function WeekBar({
    view,
    children
}: {
    view: CompetitionWeekView
    children?: ReactNode
}) {
    const { week, offset } = view
    return (
        <WeekHeading
            current={view.currentWeek}
            // The loaded week trails the one picked while it's being fetched.
            range={
                week && week.offset === offset
                    ? formatWeekRange(week.weekStart)
                    : null
            }
            canGoBack={view.canGoBack}
            onBack={view.back}
            onForward={view.forward}
        >
            {children}
        </WeekHeading>
    )
}

/** Whole weeks from the one containing [since] to the current one. */
function weeksSince(since: number, now = Date.now()): number {
    // Rounded, since a week with a DST change isn't exactly seven days long.
    return Math.max(
        0,
        Math.round(
            (localWeekStart(0, now) - localWeekStart(0, since)) / (7 * DAY_MS)
        )
    )
}

/**
 * The week a competition's pages show, and the controls that change it. Held by
 * the screen so the standings and the shared goals stay on the same week.
 *
 * [startedAt] is when the competition was created: the week it falls in is as
 * far back as the pages go. Until it's known, only the current week is shown.
 */
export function useCompetitionWeek(
    competitionId: string,
    refreshKey = 0,
    startedAt?: number
) {
    const api = useApi()
    const [offset, setOffset] = useState(0)
    const earliest = startedAt === undefined ? 0 : weeksSince(startedAt)
    const [week, setWeek] = useState<CompetitionWeek | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!competitionId) return
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

    return {
        /** Weeks before the current one; 0 is this week. */
        offset,
        week,
        loading,
        currentWeek: offset === 0,
        /** False on the week the competition started in. */
        canGoBack: offset < earliest,
        back: () => setOffset((o) => Math.min(earliest, o + 1)),
        forward: () => setOffset((o) => Math.max(0, o - 1))
    }
}

export type CompetitionWeekView = ReturnType<typeof useCompetitionWeek>

/** The standings page: the week's ranking, one roomy row per member. */
export function StandingsPage({
    competition,
    view,
    isOwner,
    meID,
    colors: colorMap
}: {
    competition: CompetitionDetail
    view: CompetitionWeekView
    isOwner: boolean
    meID?: string
    colors: Record<string, string>
}) {
    const colors = useColors()
    const { week, loading, currentWeek } = view
    const goalCount = week?.goals.length ?? 0
    const standings =
        week && week.goals.length > 0
            ? computeStandings(competition, week, currentWeek, colorMap)
            : null

    return (
        <>
            {(goalCount > 0 || !currentWeek) && <WeekBar view={view} />}

            {standings ? (
                <Card className="overflow-hidden">
                    {standings.map((s, i) => (
                        <MemberRow
                            key={s.userID}
                            rank={i + 1}
                            color={s.color}
                            userID={s.userID}
                            username={s.username}
                            avatarVersion={s.avatarVersion}
                            isMe={s.userID === meID}
                            divided={i > 0}
                            value={
                                <Mono className="text-[14px] text-ink-3">
                                    <Text className="font-bold text-ink">
                                        {s.goalsHit}
                                    </Text>
                                    /{goalCount}{" "}
                                    {goalCount === 1 ? "goal" : "goals"}
                                </Mono>
                            }
                        >
                            <View className="flex-row items-center justify-between">
                                <Text className="text-[12px] text-ink-3">
                                    {streakLabel(s.streak)}
                                </Text>
                                {/* One segment per shared goal, in the
                                        Goals page's order. */}
                                <View className="flex-row gap-1">
                                    {s.hits.map((hit, gi) => (
                                        <View
                                            key={gi}
                                            style={{
                                                width: 18,
                                                height: 8,
                                                borderRadius: 4,
                                                backgroundColor: hit
                                                    ? s.color
                                                    : colors.line
                                            }}
                                        />
                                    ))}
                                </View>
                            </View>
                        </MemberRow>
                    ))}
                </Card>
            ) : (
                <Card className="p-5">
                    <Text className="text-[13px] text-ink-3">
                        {loading
                            ? "Loading…"
                            : isOwner
                              ? "Add a shared goal on the Goals page to start ranking members."
                              : "No shared goals yet."}
                    </Text>
                </Card>
            )}
        </>
    )
}

/**
 * The goals page: a card per shared goal. In [editMode] — the owner's pencil,
 * top right — each card gets an Edit button and a New shared goal card follows
 * them, like the Goals tab.
 */
export function GoalsPage({
    competition,
    view,
    editMode,
    onAdd,
    meID,
    colors: colorMap,
    onChanged
}: {
    competition: CompetitionDetail
    view: CompetitionWeekView
    editMode: boolean
    /** Opens the new shared goal sheet; owner-only. */
    onAdd?: () => void
    meID?: string
    colors: Record<string, string>
    /** Called after the owner edits or removes a shared goal. */
    onChanged: () => void
}) {
    const api = useApi()
    const { week, loading, currentWeek, offset } = view
    // A day picked for every goal at once (0 = Monday). It belongs to the week
    // it was picked in, so changing week returns to the whole week.
    const [picked, setPicked] = useState<{
        offset: number
        day: number
    } | null>(null)
    const day = picked?.offset === offset ? picked.day : null
    const [editing, setEditing] = useState<CompetitionGoalBoard | null>(null)

    // Adding a goal that already exists replaces it, minimum included.
    async function save(
        board: CompetitionGoalBoard,
        target: number,
        minWorkoutMin: number | null
    ) {
        await addCompetitionGoal(api, competition.id, {
            integration: board.integration,
            metric: board.metric,
            period: board.period,
            target,
            ...(minWorkoutMin ? { minWorkoutMin } : {})
        })
        onChanged()
    }

    async function remove(board: CompetitionGoalBoard) {
        await removeCompetitionGoal(
            api,
            competition.id,
            board.integration,
            board.metric,
            board.period
        )
        onChanged()
    }

    const hasGoals = week !== null && week.goals.length > 0
    // The day the competition started, if this is the week it started in.
    const startedAt = competition.createdAt
    const firstDay =
        week && startedAt >= week.weekStart && startedAt < week.weekEnd
            ? Math.min(6, Math.floor((startedAt - week.weekStart) / DAY_MS))
            : 0

    return (
        <>
            {(hasGoals || !currentWeek) && (
                <WeekBar view={view}>
                    {hasGoals && (
                        <DayPicker
                            selected={day}
                            from={firstDay}
                            selectable={currentWeek ? localWeekday() + 1 : 7}
                            onSelect={(d) =>
                                setPicked(
                                    d === null ? null : { offset, day: d }
                                )
                            }
                        />
                    )}
                </WeekBar>
            )}

            {hasGoals ? (
                week.goals.map((board) => (
                    <Card key={boardKey(board)} className="p-5">
                        <GoalProgress
                            board={board}
                            currentWeek={currentWeek}
                            weekStart={week.weekStart}
                            day={day}
                            meID={meID}
                            colorMap={colorMap}
                            onEdit={
                                editMode ? () => setEditing(board) : undefined
                            }
                        />
                    </Card>
                ))
            ) : (
                <Card className="p-5">
                    <Text className="text-[13px] text-ink-3">
                        {loading ? "Loading…" : "No shared goals yet."}
                    </Text>
                </Card>
            )}

            {onAdd && <AddCard label="New shared goal" onPress={onAdd} />}

            {editing && (
                <EditGoalSheet
                    key={boardKey(editing)}
                    goal={editing}
                    shared
                    onClose={() => setEditing(null)}
                    onSave={(target, _color, minWorkoutMin) =>
                        save(editing, target, minWorkoutMin)
                    }
                    onDelete={() => remove(editing)}
                />
            )}
        </>
    )
}
