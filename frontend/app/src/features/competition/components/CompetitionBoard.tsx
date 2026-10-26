// The heart of a competition: a standings leaderboard answering "who's hitting
// their goals?", plus a per-goal breakdown showing every member's progress toward
// each shared goal for one Monday-anchored week (with prev/next week navigation).
//
// Ported from the web board. The scoring is identical; the layout is restacked for
// a phone — each member's progress row puts the name/total above its bar instead
// of laying them out in one wide flex row.

import { useEffect, useState } from "react"
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
import { colors } from "../../../theme"
import { BackChevronIcon, ChevronIcon, GearIcon } from "../../../ui/icons"
import {
    Bar,
    Card,
    Eyebrow,
    IntegrationIcon,
    Mono,
    SourceTile
} from "../../../ui/primitives"
import { EditGoalSheet } from "../../dashboard/components/EditGoalSheet"
import {
    formatAmount,
    formatWeekRange,
    integrationVisual,
    unitLabel
} from "../../dashboard/types"
import { FALLBACK_BAR_COLOR, onMemberFill } from "../colors"
import {
    computeStandings,
    displayValue,
    paceTarget,
    weeklyTarget,
    type MemberStanding
} from "../standings"

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
    return `${target} ${unit} / ${cadence}`
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
        <View>
            <View className="flex-row items-center gap-3 px-2 pb-2">
                <View className="w-6" />
                <Text className="flex-1 text-[12px] font-medium text-ink-3">
                    Member
                </Text>
                <Text className="text-[12px] font-medium text-ink-3">
                    On pace
                </Text>
                <Text className="w-12 text-right text-[12px] font-medium text-ink-3">
                    Streak
                </Text>
            </View>

            {standings.map((s, i) => {
                const isMe = s.userID === meID
                return (
                    <View
                        key={s.userID}
                        className={`flex-row items-center gap-3 rounded-xl px-2 py-2.5 ${
                            isMe ? "bg-bg-sunken" : ""
                        }`}
                    >
                        {/* Rank, in the member's color */}
                        <View
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: s.color
                            }}
                            className="items-center justify-center"
                        >
                            <Text
                                style={{ color: onMemberFill(s.color) }}
                                className="text-xs font-bold"
                            >
                                {i + 1}
                            </Text>
                        </View>

                        {/* Identity */}
                        <View className="flex-1 flex-row items-center gap-2">
                            <Text
                                numberOfLines={1}
                                className="flex-shrink text-[15px] font-semibold text-ink"
                            >
                                {s.username}
                            </Text>
                            {isMe && (
                                <Text className="text-[11px] text-ink-3">
                                    you
                                </Text>
                            )}
                        </View>

                        {/* Goals-on-pace: segmented indicator + count */}
                        {goalCount > 0 ? (
                            <View className="flex-row items-center gap-2">
                                <View className="flex-row gap-1">
                                    {s.hits.map((hit, gi) => (
                                        <View
                                            key={gi}
                                            style={{
                                                width: 14,
                                                height: 8,
                                                borderRadius: 4,
                                                backgroundColor: hit
                                                    ? s.color
                                                    : colors.line
                                            }}
                                        />
                                    ))}
                                </View>
                                <Mono className="text-[13px] text-ink-3">
                                    <Text className="font-bold text-ink">
                                        {s.goalsHit}
                                    </Text>
                                    /{goalCount}
                                </Mono>
                            </View>
                        ) : (
                            <Text className="text-xs text-ink-3">—</Text>
                        )}

                        {/* Streak */}
                        <Mono className="w-12 text-right text-[13px] text-ink-3">
                            <Text className="font-bold text-ink">
                                {s.streak}
                            </Text>
                            d
                        </Mono>
                    </View>
                )
            })}
        </View>
    )
}

function GoalProgress({
    board,
    currentWeek,
    meID,
    colorMap,
    onEdit
}: {
    board: CompetitionGoalBoard
    currentWeek: boolean
    meID?: string
    colorMap: Record<string, string>
    /** Opens the edit sheet; owner-only. */
    onEdit?: () => void
}) {
    const visual = integrationVisual(board.integration)
    const wt = weeklyTarget(board)
    const pace = paceTarget(board, currentWeek)
    const pacePct = Math.min(100, (pace / wt) * 100)
    // Daily goals show per-day amounts against the daily target.
    const daily = board.period === "DAILY"
    const shown = (m: CompetitionMemberWeek) =>
        displayValue(board, m, currentWeek)
    const members = [...board.members].sort((a, b) => shown(b) - shown(a))
    const amount = (v: number) =>
        formatAmount(board.integration, board.metric, v)

    return (
        <View className="gap-3.5 py-5">
            <View className="flex-row items-center gap-2.5">
                <SourceTile
                    size="sm"
                    label={visual.glyph}
                    variant={visual.tile}
                    icon={
                        <IntegrationIcon name={board.integration} size={18} />
                    }
                />
                <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-ink">
                        {goalLabel(board)}
                    </Text>
                    <Text className="text-[11px] text-ink-3">
                        {visual.sourceLabel} · {board.metric}
                    </Text>
                </View>
                {onEdit && (
                    <Pressable
                        onPress={onEdit}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${goalLabel(board)}`}
                        hitSlop={8}
                        className="h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-bg-card"
                    >
                        <GearIcon color={colors.ink3} size={16} />
                    </Pressable>
                )}
            </View>

            <View className="gap-3">
                {members.map((m) => {
                    const isMe = m.userID === meID
                    const color = colorMap[m.userID] ?? FALLBACK_BAR_COLOR
                    const pct = Math.min(
                        100,
                        (shown(m) / Math.max(1, board.target)) * 100
                    )
                    return (
                        <View key={m.userID} className="gap-1.5">
                            <View className="flex-row items-center gap-2">
                                <Text
                                    numberOfLines={1}
                                    className="flex-1 text-[13px] font-medium text-ink"
                                >
                                    {m.username}
                                    {isMe && (
                                        <Text className="text-[10px] text-ink-3">
                                            {"  you"}
                                        </Text>
                                    )}
                                </Text>
                                <Mono className="text-xs text-ink-3">
                                    <Text className="font-bold text-ink">
                                        {amount(shown(m))}
                                    </Text>
                                    /{amount(board.target)}
                                </Mono>
                            </View>

                            {/* Progress toward the target; weekly goals add a pace marker. */}
                            <Bar pct={pct} color={color} height={12}>
                                {!daily && (
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

/** The ‹ week › control at the foot of the standings. */
function WeekSwitcher({
    label,
    canGoForward,
    onBack,
    onForward
}: {
    label: string
    canGoForward: boolean
    onBack: () => void
    onForward: () => void
}) {
    return (
        <View className="-mx-2 -mb-2 mt-3 flex-row items-center justify-between border-t border-line-2 pt-2">
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous week"
                onPress={onBack}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full"
            >
                <BackChevronIcon color={colors.ink2} size={18} />
            </Pressable>
            <Mono className="text-[12px] text-ink-2">{label}</Mono>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next week"
                onPress={onForward}
                disabled={!canGoForward}
                hitSlop={8}
                className={`h-9 w-9 items-center justify-center rounded-full ${
                    canGoForward ? "" : "opacity-25"
                }`}
            >
                <ChevronIcon color={colors.ink2} size={18} />
            </Pressable>
        </View>
    )
}

export function CompetitionBoard({
    competition,
    isOwner,
    meID,
    colors: colorMap,
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
    const [editing, setEditing] = useState<CompetitionGoalBoard | null>(null)

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

    // Adding a goal that already exists replaces its target.
    async function save(board: CompetitionGoalBoard, target: number) {
        await addCompetitionGoal(api, competition.id, {
            integration: board.integration,
            metric: board.metric,
            period: board.period,
            target
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

    const currentWeek = offset === 0
    const goalCount = week?.goals.length ?? 0
    const standings =
        week && week.goals.length > 0
            ? computeStandings(competition, week, currentWeek, colorMap)
            : null

    return (
        <View className="gap-4">
            {/* Standings — the at-a-glance "who's winning", with the week
                switcher along its foot; it picks the week for both cards. */}
            <Card className="p-5">
                <View className="mb-4">
                    <Eyebrow>Standings</Eyebrow>
                </View>
                {standings ? (
                    <Standings
                        standings={standings}
                        goalCount={goalCount}
                        meID={meID}
                    />
                ) : (
                    <Text className="text-[13px] text-ink-3">
                        {loading
                            ? "Loading…"
                            : isOwner
                              ? "Tap + to add a shared goal and start ranking members."
                              : "No shared goals yet."}
                    </Text>
                )}
                {(goalCount > 0 || !currentWeek) && (
                    <WeekSwitcher
                        label={
                            currentWeek
                                ? "This week"
                                : week
                                  ? formatWeekRange(week.weekStart)
                                  : "—"
                        }
                        canGoForward={!currentWeek}
                        onBack={() => setOffset((o) => o + 1)}
                        onForward={() => setOffset((o) => Math.max(0, o - 1))}
                    />
                )}
            </Card>

            {/* Per-goal progress breakdown. */}
            <Card className="p-5">
                <View className="mb-2 flex-row items-center justify-between">
                    <Eyebrow>Shared goals</Eyebrow>
                    {/* Past weeks are named, so it's clear what's shown. */}
                    {!currentWeek && week && (
                        <Mono className="text-[11px] text-ink-3">
                            {formatWeekRange(week.weekStart)}
                        </Mono>
                    )}
                </View>

                {!week || week.goals.length === 0 ? (
                    <Text className="text-[13px] text-ink-3">
                        {loading ? "Loading…" : "No goals yet"}
                    </Text>
                ) : (
                    <View>
                        {week.goals.map((board, i) => (
                            <View
                                key={boardKey(board)}
                                className={
                                    i > 0 ? "border-t border-line-2" : ""
                                }
                            >
                                <GoalProgress
                                    board={board}
                                    currentWeek={currentWeek}
                                    meID={meID}
                                    colorMap={colorMap}
                                    onEdit={
                                        isOwner
                                            ? () => setEditing(board)
                                            : undefined
                                    }
                                />
                            </View>
                        ))}
                    </View>
                )}
            </Card>

            {editing && (
                <EditGoalSheet
                    key={boardKey(editing)}
                    goal={editing}
                    shared
                    onClose={() => setEditing(null)}
                    onSave={(target) => save(editing, target)}
                    onDelete={() => remove(editing)}
                />
            )}
        </View>
    )
}
