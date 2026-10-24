// Goal streak: a compact chip for the dashboard's Goals card, and the full stats +
// recent-days strip for the Goals tab.

import { Alert, Pressable, Text, View } from "react-native"
import type { DayStatus } from "@shared/index"
import { colors } from "../../../theme"
import { InfoIcon } from "../../../ui/icons"
import { Chip, Mono } from "../../../ui/primitives"
import { Stat } from "./Stat"

const STREAK_EXPLANATION =
    "A day counts when you hit every daily goal. Weekly goals are checked once " +
    "the week ends."

/** Streak count with an info button that explains how days are counted. */
export function StreakChip({ streak }: { streak: number }) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${streak} day streak. How streaks work`}
            hitSlop={8}
            onPress={() => Alert.alert("Streaks", STREAK_EXPLANATION)}
        >
            <Chip>
                <Mono className="text-[12px] font-semibold text-ink">
                    {streak}d streak
                </Mono>
                <InfoIcon color={colors.ink3} size={14} />
            </Chip>
        </Pressable>
    )
}

/**
 * Fill + outline for one day in the strip. Mirrors web's `.streak-dot` modifiers.
 * Today is reported as MISS until its goals are met, but the day isn't over — so it
 * renders as an empty outline instead of a miss.
 */
function dotStyle(s: DayStatus, isToday: boolean) {
    if (isToday && s === "MISS") {
        return { borderWidth: 2, borderColor: colors.ink }
    }
    switch (s) {
        case "TODAY":
            return {
                backgroundColor: colors.lime,
                borderWidth: 2,
                borderColor: colors.ink
            }
        case "ON":
            return { backgroundColor: colors.lime }
        case "MISS":
            return { backgroundColor: colors.coral, opacity: 0.6 }
        default:
            return { backgroundColor: colors.line }
    }
}

function LegendItem({
    status,
    today = false,
    label
}: {
    status: DayStatus
    today?: boolean
    label: string
}) {
    return (
        <View className="flex-row items-center gap-1.5">
            <View
                style={[
                    { width: 10, height: 10, borderRadius: 2 },
                    dotStyle(status, today)
                ]}
            />
            <Text className="text-xs text-ink-3">{label}</Text>
        </View>
    )
}

export function StreakSection({
    streak,
    history
}: {
    streak: number
    history: DayStatus[]
}) {
    const perfect = history.filter((s) => s === "ON" || s === "TODAY").length
    const totalRated = history.filter((s) => s !== "NONE").length
    const todayPending = history[history.length - 1] === "MISS"
    // Today only joins the streak once its goals are met, so a run through yesterday
    // still reads 0 until then.
    const yesterdayOn = history[history.length - 2] === "ON"
    const sub =
        streak > 0
            ? "days in a row, every goal hit"
            : todayPending && yesterdayOn
              ? "finish today's goals to keep your run"
              : todayPending
                ? "hit all of today's goals to start"
                : "no streak yet"

    return (
        <View>
            <View className="flex-row gap-4">
                <Stat
                    label="Current"
                    value={`${streak}d`}
                    sub={sub}
                    tone="lime"
                />
                <Stat
                    label="Perfect"
                    value={`${perfect}`}
                    sub={`of the last ${totalRated || history.length} days`}
                />
            </View>

            <View className="mt-4 border-t border-line-2 pt-3.5">
                <Text className="mb-2 text-xs text-ink-3">
                    last {history.length} days
                </Text>
                <View className="flex-row items-center gap-1">
                    {history.map((s, i) => (
                        <View
                            key={i}
                            style={[
                                { height: 22, borderRadius: 4 },
                                dotStyle(s, i === history.length - 1)
                            ]}
                            className="flex-1"
                        />
                    ))}
                </View>
                <View className="mt-2.5 flex-row flex-wrap gap-x-3 gap-y-1">
                    <LegendItem status="ON" label="every goal hit" />
                    <LegendItem status="MISS" label="missed" />
                    <LegendItem
                        status="MISS"
                        today
                        label="today, in progress"
                    />
                </View>
                <Text className="mt-2.5 text-xs leading-4 text-ink-3">
                    {STREAK_EXPLANATION}
                </Text>
            </View>
        </View>
    )
}
