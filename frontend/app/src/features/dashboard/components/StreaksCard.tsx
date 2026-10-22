// Summary card — streak stats and the recent-days strip.

import { Text, View } from "react-native"
import type { DayStatus, Goal } from "@shared/index"
import { colors } from "../../../theme"
import { Card, Eyebrow, Mono } from "../../../ui/primitives"
import { isOnTrack } from "../types"
import { Stat } from "./Stat"

/** Fill + outline for one day in the strip. Mirrors web's `.streak-dot` modifiers. */
function dotStyle(s: DayStatus) {
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

export function StreaksCard({
    streak,
    history,
    goals
}: {
    streak: number
    history: DayStatus[]
    goals: Goal[]
}) {
    const perfect = history.filter((s) => s === "ON" || s === "TODAY").length
    const totalRated = history.filter((s) => s !== "NONE").length
    const activeOnTrack = goals.filter((g) => isOnTrack(g)).length

    return (
        <Card className="p-5">
            <Eyebrow className="mb-3.5">Streaks</Eyebrow>
            <View className="flex-row gap-4">
                <Stat
                    label="Current"
                    value={`${streak}d`}
                    sub={
                        streak === 0
                            ? "no streak yet"
                            : "consecutive perfect days"
                    }
                    tone="lime"
                />
                <Stat
                    label="On track"
                    value={`${activeOnTrack}`}
                    sub={`of ${goals.length} goals today`}
                />
            </View>

            <View className="mt-4 border-t border-line-2 pt-3.5">
                <View className="mb-2 flex-row justify-between">
                    <Text className="text-xs text-ink-3">
                        last {history.length} days
                    </Text>
                    <Mono className="text-xs text-ink-3">
                        {perfect} / {totalRated || history.length} perfect
                    </Mono>
                </View>
                <View className="flex-row items-center gap-1">
                    {history.map((s, i) => (
                        <View
                            key={i}
                            style={[
                                { height: 22, borderRadius: 4 },
                                dotStyle(s)
                            ]}
                            className="flex-1"
                        />
                    ))}
                </View>
            </View>
        </Card>
    )
}
