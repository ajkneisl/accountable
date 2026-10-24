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
    type CompetitionDetail,
    type CompetitionGoalBoard,
    type CompetitionWeek,
    getCompetitionWeek,
    removeCompetitionGoal,
    useApi
} from "@shared/index"
import { colors } from "../../../theme"
import { confirm } from "../../../ui/confirm"
import {
    Bar,
    Button,
    Card,
    Dot,
    ErrorList,
    Eyebrow,
    Mono,
    SourceTile
} from "../../../ui/primitives"
import {
    formatAmount,
    formatWeekRange,
    integrationVisual,
    paceStatus,
    unitLabel
} from "../../dashboard/types"
import { FALLBACK_BAR_COLOR, MEDAL } from "../colors"
import {
    computeStandings,
    paceTarget,
    weeklyTarget,
    type MemberStanding
} from "../standings"
import { AddCompetitionGoalSheet } from "./AddCompetitionGoalSheet"

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
                        {/* Rank */}
                        <View
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor:
                                    i < 3 ? MEDAL[i] : colors.bgSunken
                            }}
                            className="items-center justify-center"
                        >
                            <Text
                                style={{
                                    color: i < 3 ? colors.ink : colors.ink3
                                }}
                                className="text-xs font-bold"
                            >
                                {i + 1}
                            </Text>
                        </View>

                        {/* Identity */}
                        <View className="flex-1 flex-row items-center gap-2">
                            <Dot color={s.color} size={10} />
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
                                                    ? colors.lime
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

            <Text className="mt-2 px-2 text-xs leading-4 text-ink-3">
                Streak is days in a row hitting every shared goal, counted from the
                day each member joined. Today counts once its goals are met.
            </Text>
        </View>
    )
}

function GoalProgress({
    board,
    currentWeek,
    meID,
    colorMap,
    onRemove,
    removing
}: {
    board: CompetitionGoalBoard
    currentWeek: boolean
    meID?: string
    colorMap: Record<string, string>
    onRemove?: () => void
    removing?: boolean
}) {
    const visual = integrationVisual(board.integration)
    const unit = unitLabel(board.integration, board.metric)
    const wt = weeklyTarget(board)
    const pace = paceTarget(board, currentWeek)
    const pacePct = Math.min(100, (pace / wt) * 100)
    const members = [...board.members].sort((a, b) => b.total - a.total)
    const amount = (v: number) =>
        formatAmount(board.integration, board.metric, v)

    return (
        <View className="gap-3.5 py-5">
            <View className="flex-row items-center gap-2.5">
                <SourceTile
                    size="sm"
                    label={visual.glyph}
                    variant={visual.tile}
                />
                <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-ink">
                        {goalLabel(board)}
                    </Text>
                    <Text className="text-[11px] text-ink-3">
                        {visual.sourceLabel} · {amount(wt)} {unit} this week
                    </Text>
                </View>
                {onRemove && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remove goal"
                        onPress={onRemove}
                        disabled={removing}
                        hitSlop={10}
                        className={`h-7 w-7 items-center justify-center rounded-full ${
                            removing ? "opacity-40" : ""
                        }`}
                    >
                        <Text className="text-base text-ink-3">×</Text>
                    </Pressable>
                )}
            </View>

            <View className="gap-3">
                {members.map((m) => {
                    const isMe = m.userID === meID
                    const color = colorMap[m.userID] ?? FALLBACK_BAR_COLOR
                    const status = paceStatus(m.total, wt, currentWeek)
                    const pct = Math.min(100, (m.total / wt) * 100)
                    return (
                        <View key={m.userID} className="gap-1.5">
                            <View className="flex-row items-center gap-2">
                                <Dot color={color} />
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
                                        {amount(m.total)}
                                    </Text>
                                    /{amount(wt)}
                                </Mono>
                                <Text
                                    className={`w-16 text-right text-[11px] font-semibold ${
                                        status === "onTrack"
                                            ? "text-lime-ink"
                                            : status === "atRisk"
                                              ? "text-ink-2"
                                              : "text-coral-ink"
                                    }`}
                                >
                                    {status === "onTrack"
                                        ? "on pace"
                                        : status === "atRisk"
                                          ? "at risk"
                                          : "behind"}
                                </Text>
                            </View>

                            {/* Progress toward the weekly target, with a pace marker. */}
                            <Bar pct={pct} color={color} height={12}>
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
                            </Bar>
                        </View>
                    )
                })}
            </View>
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
        const ok = await confirm(
            "Remove goal",
            `Remove "${goalLabel(board)}" from this competition?`,
            "Remove",
            true
        )
        if (!ok) return
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
            setError(
                err instanceof Error ? err.message : "Failed to remove goal"
            )
        } finally {
            setRemoving(null)
        }
    }

    const currentWeek = offset === 0
    const goalCount = week?.goals.length ?? 0
    const standings =
        week && week.goals.length > 0
            ? computeStandings(competition, week, currentWeek, colorMap)
            : null

    return (
        <View className="gap-4">
            {/* Standings — the at-a-glance "who's winning". */}
            <Card className="p-5">
                <View className="mb-4 flex-row items-center justify-between">
                    <Eyebrow>Standings</Eyebrow>
                    <Text className="text-[11px] text-ink-3">
                        ranked by goals on pace
                    </Text>
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
                            : "Add a shared goal below to start ranking members."}
                    </Text>
                )}
            </Card>

            {/* Per-goal progress breakdown. */}
            <Card className="p-5">
                <View className="mb-2 flex-row items-center justify-between">
                    <Eyebrow>Shared goals</Eyebrow>
                    {isOwner && (
                        <Button
                            label="+ Add goal"
                            variant="line"
                            size="sm"
                            onPress={() => setAdding(true)}
                        />
                    )}
                </View>

                <View className="mb-2 flex-row items-center justify-between">
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Previous week"
                        onPress={() => setOffset((o) => o + 1)}
                        hitSlop={12}
                        className="px-2"
                    >
                        <Text className="text-base text-ink-3">‹</Text>
                    </Pressable>
                    <Mono className="text-[11px] text-ink-3">
                        {currentWeek
                            ? "This week"
                            : week
                              ? formatWeekRange(week.weekStart)
                              : "—"}
                    </Mono>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Next week"
                        onPress={() => setOffset((o) => Math.max(0, o - 1))}
                        disabled={currentWeek}
                        hitSlop={12}
                        className={`px-2 ${currentWeek ? "opacity-30" : ""}`}
                    >
                        <Text className="text-base text-ink-3">›</Text>
                    </Pressable>
                </View>

                {error !== null && (
                    <View className="mb-3">
                        <ErrorList errors={[error]} />
                    </View>
                )}

                {!week || week.goals.length === 0 ? (
                    <Text className="text-[13px] text-ink-3">
                        {loading
                            ? "Loading…"
                            : isOwner
                              ? "No goals yet. Add one to start the competition."
                              : "No goals yet. The owner can add them."}
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
                                    onRemove={
                                        isOwner ? () => remove(board) : undefined
                                    }
                                    removing={removing === boardKey(board)}
                                />
                            </View>
                        ))}
                    </View>
                )}
            </Card>

            {adding && (
                <AddCompetitionGoalSheet
                    competitionId={competition.id}
                    onClose={() => setAdding(false)}
                    onAdded={onChanged}
                />
            )}
        </View>
    )
}
