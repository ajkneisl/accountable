// A single goal card — progress and a fixed Mon–Sun week chart, for the week the
// Goals tab's heading picks for every card at once. A weekly goal adds a bar of
// the week's total with a tick where it should be by today, so it's clear
// whether the goal is on pace without reading the percentage. The amount sits top right; while the Goals tab is in edit mode it
// becomes an Edit button that opens the edit sheet (target, color, delete).
// Competition goals belong to the competition, so they're never editable here; the
// Goals tab groups them under a heading that names and opens it. The web card's
// scroll-into-view/flash behaviour is dropped: it existed to answer sidebar deep links,
// and there's no sidebar on mobile.

import { useEffect, useMemo, useState } from "react"
import { Text, View } from "react-native"
import {
    type Goal,
    type GoalWeek,
    getGoalWeek,
    requiredDaysOf,
    useApi
} from "@shared/index"
import { useScheme } from "../../../theme"
import {
    Bar,
    Button,
    Card,
    IntegrationIcon,
    Mono,
    PaceTick,
    SourceTile
} from "../../../ui/primitives"
import {
    formatAmount,
    formatWeekRange,
    goalFill,
    goalOnFill,
    goalTitle,
    integrationVisual,
    isLimit,
    isRestDay,
    localWeekday,
    meetsTarget,
    paceBar,
    unitLabel
} from "../types"
import { WeekChart } from "./WeekChart"

const DAY_MS = 86_400_000

/** "Tue, Nov 3" for a day picked on the chart. */
const DAY_FMT = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
})

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

export function GoalCard({
    goal,
    offset,
    onEdit
}: {
    goal: Goal
    /** The week shown: 0 = the current week, 1 = last week, … */
    offset: number
    /** Opens the edit sheet. Passed only while the Goals tab is in edit mode, and never for competition goals. */
    onEdit?: () => void
}) {
    const api = useApi()
    const scheme = useScheme()
    const visual = integrationVisual(goal.integration)
    const unit = unitLabel(goal.integration, goal.metric)

    // A day picked on the chart (0 = Monday), shown in the headline instead of
    // the usual figure. It belongs to the week it was picked in, so changing
    // week returns to the usual figure.
    const [picked, setPicked] = useState<{
        offset: number
        day: number
    } | null>(null)
    const day = picked?.offset === offset ? picked.day : null
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
    // week label counts the days the target was hit. Only days the goal was due
    // are scored.
    const daily = goal.period === "DAILY"
    const daysCounted = offset === 0 ? localWeekday() + 1 : 7
    const dueDays = requiredDaysOf(goal).filter((d) => d < daysCounted)
    const dueVals = dueDays.map((d) => vals[d] ?? 0)
    const daysHit = dueVals.filter((v) =>
        meetsTarget(goal, v, goal.target)
    ).length
    const headline =
        day !== null
            ? (vals[day] ?? 0)
            : daily
              ? offset === 0
                  ? (vals[localWeekday()] ?? 0)
                  : dueVals.reduce((sum, v) => sum + v, 0) /
                    Math.max(1, dueVals.length)
              : total
    // Where a weekly total should be by now: the target spread over the days
    // already over, or for a limit its share through today. A past week is
    // simply held to the whole target.
    const limit = isLimit(goal.integration, goal.metric)
    const pace =
        offset !== 0
            ? weeklyTarget
            : limit
              ? (weeklyTarget * (localWeekday() + 1)) / 7
              : paceBar(weeklyTarget)
    const weekPct = Math.round((total / Math.max(1, weeklyTarget)) * 100)
    const onPace = meetsTarget(goal, total, pace)

    // Noon, so a DST change can't tip the label onto the neighbouring day.
    const dayLabel =
        day !== null && week
            ? DAY_FMT.format(
                  new Date(week.weekStart + day * DAY_MS + DAY_MS / 2)
              )
            : null

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
                        {visual.sourceLabel}
                    </Text>
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
                        {dayLabel ? (
                            // A picked day: its own target for a daily goal (a
                            // weekly target means nothing for one day). The
                            // footer names the day.
                            <Text className="text-[11px] text-ink-3">
                                {daily
                                    ? `/ ${formatAmount(goal.integration, goal.metric, goal.target)} ${unit}`
                                    : unit}
                            </Text>
                        ) : (
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
                                    (offset !== 0
                                        ? " · daily avg"
                                        : isRestDay(goal)
                                          ? " · rest day"
                                          : " · today")}
                            </Text>
                        )}
                    </View>
                )}
            </View>

            <WeekChart
                vals={vals}
                target={dailyTargetFor(goal)}
                limit={limit}
                requiredDays={requiredDaysOf(goal)}
                color={goalFill(goal, scheme)}
                selected={day}
                onSelect={(d) =>
                    setPicked(d === null ? null : { offset, day: d })
                }
                selectableDays={offset === 0 ? localWeekday() + 1 : 7}
            />

            {/* The week's total against a weekly target. The tick is the pace:
                the fill reaching it means on track (for a limit, staying short
                of it). A past week has no tick — its mark is the bar's end. */}
            {!daily && (
                <View
                    accessible
                    accessibilityLabel={`${weekPct}% of the weekly ${
                        limit ? "limit" : "target"
                    }, ${
                        offset !== 0
                            ? onPace
                                ? "met"
                                : "missed"
                            : onPace
                              ? "on pace"
                              : limit
                                ? "over pace"
                                : "behind pace"
                    }`}
                >
                    <Bar
                        pct={weekPct}
                        color={goalFill(goal, scheme)}
                        height={8}
                    >
                        {offset === 0 && (
                            <PaceTick
                                at={(pace / Math.max(1, weeklyTarget)) * 100}
                                filled={total >= pace}
                                onFillColor={goalOnFill(goal, scheme)}
                            />
                        )}
                    </Bar>
                </View>
            )}

            {/* What the figure above covers: a picked day on its own, since
                the week's tally isn't about that day; otherwise the week, in
                the same ink as its tally so the dim slash between them recedes. */}
            <Mono className="text-center text-[11px] text-ink-3">
                {dayLabel ? (
                    <Text className="font-bold text-ink">{dayLabel}</Text>
                ) : (
                    <>
                        <Text className="text-ink">
                            {offset === 0 ? "This week" : rangeLabel}
                        </Text>
                        {" / "}
                        <Text className="font-bold text-ink">
                            {daily
                                ? `${daysHit} of ${dueDays.length} days`
                                : `${weekPct}%`}
                        </Text>
                    </>
                )}
            </Mono>
        </Card>
    )
}
