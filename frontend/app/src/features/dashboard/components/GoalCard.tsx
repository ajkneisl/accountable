// A single goal card — progress, a fixed Mon–Sun week chart, and per-goal week
// navigation. The amount sits top right; while the Goals tab is in edit mode it
// becomes an Edit button that opens the edit sheet (target, color, delete).
// Competition goals belong to the competition, so they're never editable here and
// carry a chip naming it beside their source. The web card's
// scroll-into-view/flash behaviour is dropped: it existed to answer sidebar deep links,
// and there's no sidebar on mobile.

import { useEffect, useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import { type Goal, type GoalWeek, getGoalWeek, useApi } from "@shared/index"
import {
    Button,
    Card,
    Chip,
    Dot,
    IntegrationIcon,
    Mono,
    SourceTile
} from "../../../ui/primitives"
import {
    formatAmount,
    formatWeekRange,
    goalFill,
    goalTitle,
    integrationVisual,
    isLimit,
    localWeekday,
    meetsTarget,
    unitLabel
} from "../types"
import { WeekChart } from "./WeekChart"

/**
 * Per-day target used for the chart's reference line.
 * - DAILY goals: the full target each day.
 * - WEEKLY goals: target spread evenly across 7 days.
 */
function dailyTargetFor(goal: Goal): number {
    return goal.period === "DAILY" ? goal.target : goal.target / 7
}

/** Chip naming a competition goal's competition, beside its source; opens it. */
function CompetitionChip({
    competition,
    color
}: {
    competition: NonNullable<Goal["competition"]>
    color: string
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open competition ${competition.name}`}
            onPress={() =>
                router.push({
                    pathname: "/competition/[id]",
                    params: { id: competition.id }
                })
            }
            hitSlop={8}
            className="max-w-[45%]"
        >
            <Chip>
                <Dot color={color} size={6} />
                <Text
                    numberOfLines={1}
                    className="shrink text-[11px] font-semibold text-ink-2"
                >
                    {competition.name}
                </Text>
            </Chip>
        </Pressable>
    )
}

/** Weekly-equivalent target: weekly goals as-is, daily goals × 7. */
function weeklyTargetFor(goal: Goal): number {
    return goal.period === "WEEKLY" ? goal.target : goal.target * 7
}

export function GoalCard({
    goal,
    onEdit
}: {
    goal: Goal
    /** Opens the edit sheet. Passed only while the Goals tab is in edit mode, and never for competition goals. */
    onEdit?: () => void
}) {
    const api = useApi()
    const visual = integrationVisual(goal.integration)
    const unit = unitLabel(goal.integration, goal.metric)

    // 0 = current week, 1 = last week, … Drives the per-goal week navigation.
    const [offset, setOffset] = useState(0)
    // Past weeks are fetched on demand; the current week ships inside the goal payload.
    const [fetchedWeek, setFetchedWeek] = useState<GoalWeek | null>(null)

    // The current Monday-anchored week, already in the dashboard payload — no request needed.
    const seedWeek: GoalWeek = useMemo(
        () => ({
            weekStart: goal.weekStart,
            weekEnd: goal.weekStart + 7 * 86_400_000,
            vals: goal.weekVals,
            total: goal.weekTotal,
            target: goal.target,
            period: goal.period
        }),
        [
            goal.weekStart,
            goal.weekVals,
            goal.weekTotal,
            goal.target,
            goal.period
        ]
    )

    useEffect(() => {
        if (offset === 0) return // current week comes from the payload — skip the request
        let cancelled = false
        getGoalWeek(
            api,
            goal.integration,
            goal.metric,
            goal.period,
            offset,
            goal.competition?.id
        )
            .then((w) => {
                if (!cancelled) setFetchedWeek(w)
            })
            .catch(() => {
                if (!cancelled) setFetchedWeek(null)
            })
        return () => {
            cancelled = true
        }
    }, [
        api,
        goal.integration,
        goal.metric,
        goal.period,
        goal.competition?.id,
        offset
    ])

    const week = offset === 0 ? seedWeek : fetchedWeek

    // Fall back to the dashboard payload until the week request resolves.
    const vals = week?.vals ?? goal.vals
    const total = week?.total ?? goal.progress
    const weeklyTarget = weeklyTargetFor(goal)

    const rangeLabel = week ? formatWeekRange(week.weekStart) : "—"

    // Daily goals read per day, not as a ×7 weekly sum: the headline is today's
    // value (a past week's daily average) against the daily target, and the
    // week label counts the days the target was hit.
    const daily = goal.period === "DAILY"
    const daysCounted = offset === 0 ? localWeekday() + 1 : 7
    const daysHit = vals
        .slice(0, daysCounted)
        .filter((v) => meetsTarget(goal, v, goal.target)).length
    const headline = daily
        ? offset === 0
            ? (vals[localWeekday()] ?? 0)
            : total / 7
        : total

    return (
        <Card className="gap-4 p-5">
            <View className="flex-row items-center gap-3">
                <SourceTile
                    label={visual.glyph}
                    variant={visual.tile}
                    icon={<IntegrationIcon name={goal.integration} />}
                />
                <View className="flex-1">
                    <Text className="text-base font-semibold tracking-tight text-ink">
                        {goalTitle(goal)}
                    </Text>
                    <View className="flex-row items-center gap-2">
                        <Text className="text-xs text-ink-3">
                            {visual.sourceLabel}
                        </Text>
                        {goal.competition && (
                            <CompetitionChip
                                competition={goal.competition}
                                color={goalFill(goal)}
                            />
                        )}
                    </View>
                </View>
                {onEdit ? (
                    <Button
                        label="Edit"
                        variant="line"
                        size="sm"
                        onPress={onEdit}
                    />
                ) : (
                    <View className="items-end">
                        <Mono
                            style={{
                                fontSize: 28,
                                lineHeight: 30,
                                letterSpacing: -0.8
                            }}
                            className="font-bold text-ink"
                        >
                            {formatAmount(
                                goal.integration,
                                goal.metric,
                                headline
                            )}
                        </Mono>
                        <Text className="text-[11px] text-ink-3">
                            /{" "}
                            {formatAmount(
                                goal.integration,
                                goal.metric,
                                daily ? goal.target : weeklyTarget
                            )}{" "}
                            {unit}
                            {/* A weekly goal's week is in the footer already. */}
                            {daily &&
                                (offset === 0 ? " · today" : " · daily avg")}
                        </Text>
                    </View>
                )}
            </View>

            <WeekChart
                vals={vals}
                target={dailyTargetFor(goal)}
                limit={isLimit(goal.integration, goal.metric)}
                color={goalFill(goal)}
            />

            <View className="flex-row items-center justify-between">
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
                    {offset === 0 ? "This week" : rangeLabel} /{" "}
                    <Text className="font-bold text-ink">
                        {daily
                            ? `${daysHit}/${daysCounted} days`
                            : `${Math.round((total / Math.max(1, weeklyTarget)) * 100)}%`}
                    </Text>
                </Mono>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next week"
                    onPress={() => setOffset((o) => Math.max(0, o - 1))}
                    disabled={offset === 0}
                    hitSlop={12}
                    className={`px-2 ${offset === 0 ? "opacity-30" : ""}`}
                >
                    <Text className="text-base text-ink-3">›</Text>
                </Pressable>
            </View>
        </Card>
    )
}
