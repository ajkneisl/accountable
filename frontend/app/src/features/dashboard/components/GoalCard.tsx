// A single goal card — progress, a fixed Mon–Sun week chart, and per-goal week
// navigation. The web card's scroll-into-view/flash behaviour is dropped: it
// existed to answer sidebar deep links, and there's no sidebar on mobile.

import { useEffect, useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { type Goal, type GoalWeek, getGoalWeek, useApi } from "@shared/index"
import {
    Card,
    IntegrationIcon,
    Mono,
    SourceTile
} from "../../../ui/primitives"
import {
    formatAmount,
    formatWeekRange,
    goalTitle,
    integrationVisual,
    isoWeekNumber,
    paceStatus,
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

/** Weekly-equivalent target: weekly goals as-is, daily goals × 7. */
function weeklyTargetFor(goal: Goal): number {
    return goal.period === "WEEKLY" ? goal.target : goal.target * 7
}

export function GoalCard({ goal }: { goal: Goal }) {
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
        [goal.weekStart, goal.weekVals, goal.weekTotal, goal.target, goal.period]
    )

    useEffect(() => {
        if (offset === 0) return // current week comes from the payload — skip the request
        let cancelled = false
        getGoalWeek(api, goal.integration, goal.metric, goal.period, offset)
            .then((w) => {
                if (!cancelled) setFetchedWeek(w)
            })
            .catch(() => {
                if (!cancelled) setFetchedWeek(null)
            })
        return () => {
            cancelled = true
        }
    }, [api, goal.integration, goal.metric, goal.period, offset])

    const week = offset === 0 ? seedWeek : fetchedWeek

    // Fall back to the dashboard payload until the week request resolves.
    const vals = week?.vals ?? goal.vals
    const total = week?.total ?? goal.progress
    const weeklyTarget = weeklyTargetFor(goal)

    // The current week is paced against the days already over; a completed past
    // week compares against the full weekly target.
    const pace = paceStatus(total, weeklyTarget, offset === 0)
    const tone = pace === "behind" ? "coral" : visual.tile || "lime"

    const rangeLabel = week ? formatWeekRange(week.weekStart) : "—"
    const weekNum = isoWeekNumber(new Date(week ? week.weekStart : Date.now()))

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
                    <Text className="text-xs text-ink-3">
                        {visual.sourceLabel} · {goal.metric}
                    </Text>
                </View>
            </View>

            <View className="flex-row items-end gap-3">
                <Mono
                    style={{ fontSize: 40, lineHeight: 42, letterSpacing: -1.2 }}
                    className="font-bold text-ink"
                >
                    {formatAmount(goal.integration, goal.metric, total)}
                </Mono>
                <Text className="mb-1.5 flex-1 text-[13px] text-ink-3">
                    / {formatAmount(goal.integration, goal.metric, weeklyTarget)}{" "}
                    {unit} ·{" "}
                    {offset === 0 ? "this week" : rangeLabel}
                </Text>
            </View>

            <WeekChart vals={vals} target={dailyTargetFor(goal)} tone={tone} />

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
                    Week {weekNum} · {offset === 0 ? "This week" : rangeLabel}
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

            <View className="flex-row items-center border-t border-line-2 pt-2.5">
                <Text className="flex-1 text-xs text-ink-3">
                    {pace === "onTrack"
                        ? "On track"
                        : pace === "atRisk"
                          ? "At risk"
                          : "Behind pace"}
                </Text>
                <Mono className="text-[11px] text-ink-3">
                    {Math.round((total / Math.max(1, weeklyTarget)) * 100)}%
                </Mono>
            </View>
        </Card>
    )
}
