// The heart of a competition, as two of the competition screen's pages: the
// standings, answering "who's hitting their goals?", and the shared goals, one
// card each, showing every member's progress toward it. Both show one
// Monday-anchored week, shared through useCompetitionWeek, with the prev/next
// week control at the top of the page. The owner edits and adds shared goals
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
import { useColors } from "../../../theme"
import { BackChevronIcon, ChevronIcon } from "../../../ui/icons"
import {
    AddCard,
    Bar,
    Button,
    Card,
    IntegrationIcon,
    Mono,
    SourceTile
} from "../../../ui/primitives"
import { EditGoalSheet } from "../../dashboard/components/EditGoalSheet"
import {
    formatAmount,
    formatWeekRange,
    integrationVisual,
    localWeekday,
    unitLabel
} from "../../dashboard/types"
import { FALLBACK_BAR_COLOR } from "../colors"
import {
    computeStandings,
    displayValue,
    paceTarget,
    weeklyTarget
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
 * come can't be picked.
 */
function DayPicker({
    selected,
    selectable,
    onSelect
}: {
    selected: number | null
    selectable: number
    onSelect: (day: number | null) => void
}) {
    return (
        <View className="flex-row gap-1.5">
            {WEEKDAY.map((d, i) => {
                const picked = selected === i
                const future = i >= selectable
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
    const colors = useColors()
    const visual = integrationVisual(board.integration)
    const wt = weeklyTarget(board)
    const pace = paceTarget(board, currentWeek)
    const pacePct = Math.min(100, (pace / wt) * 100)
    // Daily goals show per-day amounts against the daily target.
    const daily = board.period === "DAILY"
    const shown = (m: CompetitionMemberWeek) =>
        day !== null ? (m.vals[day] ?? 0) : displayValue(board, m, currentWeek)
    const members = [...board.members].sort((a, b) => shown(b) - shown(a))
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
                {members.map((m) => {
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
                                    <Text className="font-bold text-ink">
                                        {amount(shown(m))}
                                    </Text>
                                    {showTarget && `/${amount(board.target)}`}
                                </Mono>
                            </View>

                            {/* Progress toward the target; weekly goals add a pace marker. */}
                            <Bar pct={pct} color={color} height={10}>
                                {!daily && day === null && (
                                    <View
                                        pointerEvents="none"
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            bottom: 0,
                                            left: `${pacePct}%`,
                                            width: 1,
                                            backgroundColor: colors.ink3,
                                            opacity: 0.5
                                        }}
                                    />
                                )}
                            </Bar>
                        </View>
                    )
                })}
            </View>
        </View>
    )
}

/**
 * The ‹ week › control along the top of a page. Anything else that picks what
 * the page shows — the goals' day picker — goes under it as [children].
 */
function WeekBar({
    view,
    children
}: {
    view: CompetitionWeekView
    children?: ReactNode
}) {
    const colors = useColors()
    const { week, offset, currentWeek } = view
    // The loaded week trails the one picked while it's being fetched.
    const range =
        week && week.offset === offset ? formatWeekRange(week.weekStart) : null
    return (
        <Card className="p-1.5">
            <View className="flex-row items-center justify-between">
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous week"
                    onPress={view.back}
                    hitSlop={8}
                    className="h-9 w-9 items-center justify-center rounded-full"
                >
                    <BackChevronIcon color={colors.ink2} size={18} />
                </Pressable>
                <Text className="text-[14px] font-semibold text-ink">
                    {currentWeek ? "This week" : (range ?? "—")}
                    {currentWeek && range !== null && (
                        <Text className="font-normal text-ink-3">
                            {`  ${range}`}
                        </Text>
                    )}
                </Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next week"
                    onPress={view.forward}
                    disabled={currentWeek}
                    hitSlop={8}
                    className={`h-9 w-9 items-center justify-center rounded-full ${
                        currentWeek ? "opacity-25" : ""
                    }`}
                >
                    <ChevronIcon color={colors.ink2} size={18} />
                </Pressable>
            </View>
            {children ? (
                <View className="px-1.5 pb-1.5 pt-2">{children}</View>
            ) : null}
        </Card>
    )
}

/**
 * The week a competition's pages show, and the controls that change it. Held by
 * the screen so the standings and the shared goals stay on the same week.
 */
export function useCompetitionWeek(competitionId: string, refreshKey = 0) {
    const api = useApi()
    const [offset, setOffset] = useState(0)
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
        back: () => setOffset((o) => o + 1),
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
                            username={s.username}
                            isMe={s.userID === meID}
                            divided={i > 0}
                            value={
                                <Mono className="text-[14px] text-ink-3">
                                    <Text className="font-bold text-ink">
                                        {s.goalsHit}
                                    </Text>
                                    /{goalCount}
                                </Mono>
                            }
                        >
                            <View className="flex-row items-center justify-between">
                                <Text className="text-[12px] text-ink-3">
                                    {s.streak > 0
                                        ? `${s.streak}-day streak`
                                        : "No streak"}
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

    return (
        <>
            {(hasGoals || !currentWeek) && (
                <WeekBar view={view}>
                    {hasGoals && (
                        <DayPicker
                            selected={day}
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

            {/* With no goals there's no edit mode to enter, so it's just there. */}
            {onAdd && (editMode || competition.goals.length === 0) && (
                <AddCard label="New shared goal" onPress={onAdd} />
            )}

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
