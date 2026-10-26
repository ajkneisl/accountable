// Dashboard summary of habits: today's check-offs, the last seven days against
// the seven before, and a per-habit week strip. Tapping it opens the Habits tab.
// Renders nothing until there's a habit.

import { Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import type { Habit, HabitsResponse } from "@shared/index"
import { colors } from "../../../theme"
import { Card, Eyebrow, Mono, Spinner } from "../../../ui/primitives"
import { CardFigure } from "./CardFigure"
import { HABIT_PALETTE } from "../../habits/grid"
import { useHabits } from "../../habits/HabitsData"

const WEEK = 7
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]
/** en-CA formats as yyyy-MM-dd, matching the backend's date strings. */
const ISO_DAY = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
})

function dayOffset(start: string, i: number): string {
    const [y, m, d] = start.split("-").map(Number)
    return new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10)
}

function weekday(date: string): number {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * Share of habit-days done over window indexes [from, to). Days before a habit
 * was created don't count against it.
 */
function completion(
    habits: Habit[],
    data: HabitsResponse,
    from: number,
    to: number
): number | null {
    let done = 0
    let possible = 0
    for (const h of habits) {
        const created = ISO_DAY.format(new Date(h.createdAt))
        for (let i = Math.max(0, from); i < to; i++) {
            if (dayOffset(data.start, i) < created) continue
            possible++
            if (h.done[i]) done++
        }
    }
    return possible === 0 ? null : done / possible
}

function DayBars({ data }: { data: HabitsResponse }) {
    const len = data.habits[0]?.done.length ?? 0
    const days = Array.from({ length: WEEK }, (_, k) => len - WEEK + k)

    return (
        <View className="flex-row items-end gap-2">
            {days.map((i, k) => {
                const isToday = k === WEEK - 1
                const frac = completion(data.habits, data, i, i + 1) ?? 0
                return (
                    <View key={i} className="flex-1 items-center gap-1.5">
                        <View
                            style={{ height: 48, backgroundColor: colors.bgSunken }}
                            className="w-full justify-end overflow-hidden rounded-[6px]"
                        >
                            <View
                                style={{
                                    height: `${Math.round(frac * 100)}%`,
                                    backgroundColor:
                                        frac === 1 ? colors.lime : colors.limeSoft
                                }}
                            />
                        </View>
                        <Text
                            className={`text-[11px] ${
                                isToday ? "font-bold text-ink" : "text-ink-3"
                            }`}
                        >
                            {DAY_LETTERS[weekday(dayOffset(data.start, i))]}
                        </Text>
                    </View>
                )
            })}
        </View>
    )
}

function HabitRow({ habit }: { habit: Habit }) {
    const palette = HABIT_PALETTE[habit.color]
    const week = habit.done.slice(-WEEK)

    return (
        <View className="flex-row items-center gap-3 py-2.5">
            <Text
                numberOfLines={1}
                className="flex-1 text-[14px] font-medium text-ink"
            >
                {habit.name}
            </Text>
            <View className="flex-row gap-1">
                {week.map((done, i) => (
                    <View
                        key={i}
                        style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            backgroundColor: done ? palette.fill : colors.bgSunken
                        }}
                    />
                ))}
            </View>
            <Mono className="w-9 text-right text-[13px] text-ink-3">
                {habit.streak}d
            </Mono>
        </View>
    )
}

export function HabitsReportCard() {
    const { data, loading } = useHabits()
    const openHabits = () => router.push("/habits")

    if (data === null) {
        return (
            <Card className="items-center p-6">
                {loading ? (
                    <Spinner />
                ) : (
                    <Text className="text-[13px] text-ink-3">
                        Couldn't load habits.
                    </Text>
                )}
            </Card>
        )
    }

    const habits = data.habits
    // Hidden until there's a habit; the dashboard shows onboarding instead.
    if (habits.length === 0) return null

    const len = habits[0].done.length
    const doneToday = habits.filter((h) => h.done[len - 1]).length
    const thisWeek = completion(habits, data, len - WEEK, len)
    const lastWeek = completion(habits, data, len - 2 * WEEK, len - WEEK)
    const delta =
        thisWeek !== null && lastWeek !== null
            ? Math.round((thisWeek - lastWeek) * 100)
            : null
    const best = [...habits].sort((a, b) => b.streak - a.streak)[0]

    return (
        <Pressable onPress={openHabits} accessibilityRole="button">
            <Card className="gap-5 p-5">
                <View className="flex-row items-start justify-between">
                    <View>
                        <Eyebrow className="mb-1.5">Habits</Eyebrow>
                        <Text className="text-[20px] font-semibold tracking-tight text-ink">
                            {doneToday} of {habits.length} done today
                        </Text>
                        {best.streak > 0 && (
                            <Text className="mt-1 text-[13px] text-ink-3">
                                Longest streak: {best.name}, {best.streak}{" "}
                                {best.streak === 1 ? "day" : "days"}
                            </Text>
                        )}
                    </View>
                    {thisWeek !== null && (
                        <CardFigure
                            value={`${Math.round(thisWeek * 100)}%`}
                            caption={
                                delta === null
                                    ? "last 7 days"
                                    : delta === 0
                                      ? "same as last week"
                                      : `${delta > 0 ? "+" : ""}${delta}% vs last week`
                            }
                        />
                    )}
                </View>

                <DayBars data={data} />

                <View className="border-t border-line-2 pt-1">
                    {habits.slice(0, 5).map((h) => (
                        <HabitRow key={h.id} habit={h} />
                    ))}
                    {habits.length > 5 && (
                        <Text className="pt-1 text-[13px] text-ink-3">
                            +{habits.length - 5} more
                        </Text>
                    )}
                </View>
            </Card>
        </Pressable>
    )
}
