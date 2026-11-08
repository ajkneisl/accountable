// Goal streak: the headline figure for the dashboard's Goals card, and the full
// count + recent-days strip for the Goals tab.

import { Alert, Pressable, Text, View } from "react-native"
import type { DayStatus } from "@shared/index"
import { Palette, useColors } from "../../../theme"
import { InfoIcon } from "../../../ui/icons"
import { Mono } from "../../../ui/primitives"
import { CardFigure } from "./CardFigure"

const STREAK_EXPLANATION =
    "A day counts when you hit every daily goal. Weekly goals are checked once " +
    "the week ends."

/** Streak count with an info button that explains how days are counted. */
export function StreakFigure({ streak }: { streak: number }) {
    const colors = useColors()
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${streak} day streak. How streaks work`}
            hitSlop={8}
            onPress={() => Alert.alert("Streaks", STREAK_EXPLANATION)}
        >
            <CardFigure
                value={String(streak)}
                caption="day streak"
                icon={<InfoIcon color={colors.ink3} size={12} />}
            />
        </Pressable>
    )
}

/**
 * Fill + outline for one day in the strip. Mirrors web's `.streak-dot` modifiers.
 * Today is reported as MISS until its goals are met, but the day isn't over — so it
 * renders as an empty outline instead of a miss.
 */
function dotStyle(colors: Palette, s: DayStatus, isToday: boolean) {
    if (isToday && s === "MISS") {
        return { borderWidth: 1.5, borderColor: colors.ink }
    }
    switch (s) {
        case "TODAY":
            return {
                backgroundColor: colors.lime,
                borderWidth: 1.5,
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

/**
 * The Goals tab's streak: the current run, with an info button explaining how
 * days count, over a strip of the recent days.
 */
export function StreakSection({
    streak,
    history
}: {
    streak: number
    history: DayStatus[]
}) {
    const colors = useColors()

    return (
        <View className="gap-3">
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-baseline gap-1.5">
                    <Mono className="text-[28px] font-bold text-ink">
                        {streak}
                    </Mono>
                    <Text className="text-[15px] text-ink-3">day streak</Text>
                </View>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="How streaks work"
                    hitSlop={10}
                    onPress={() => Alert.alert("Streaks", STREAK_EXPLANATION)}
                >
                    <InfoIcon color={colors.ink3} size={16} />
                </Pressable>
            </View>
            <View
                className="flex-row items-center gap-1"
                accessibilityLabel={`Last ${history.length} days`}
            >
                {history.map((s, i) => (
                    <View
                        key={i}
                        style={[
                            { height: 10, borderRadius: 3 },
                            dotStyle(colors, s, i === history.length - 1)
                        ]}
                        className="flex-1"
                    />
                ))}
            </View>
        </View>
    )
}
