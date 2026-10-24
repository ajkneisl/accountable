// Goals card — today's progress ring, on-track breakdown, and the goal streak count.

import { Text, View } from "react-native"
import { router } from "expo-router"
import type { Goal } from "@shared/index"
import { Button, Card, Eyebrow, RingChart } from "../../../ui/primitives"
import { goalPace, goalTitle, onTrackFraction } from "../types"
import { StreakChip } from "./StreaksCard"

function Header({ streak }: { streak: number }) {
    return (
        <View className="mb-3.5 flex-row items-center justify-between">
            <Eyebrow>Goals</Eyebrow>
            <StreakChip streak={streak} />
        </View>
    )
}

export function TodayCard({
    goals,
    streak
}: {
    goals: Goal[]
    streak: number
}) {
    const total = goals.length

    if (total === 0) {
        return (
            <Card className="p-5">
                <Header streak={streak} />
                <View className="flex-row items-center gap-5">
                    <RingChart pct={0} label="of today" tone="lime" />
                    <View className="flex-1">
                        <Text className="mb-3 text-[15px] text-ink-2">
                            Set a goal to start tracking your day.
                        </Text>
                        <Button
                            label="Go to goals"
                            variant="line"
                            size="sm"
                            onPress={() => router.push("/goals")}
                            className="self-start"
                        />
                    </View>
                </View>
            </Card>
        )
    }

    const onTrack = goals.filter((g) => goalPace(g) === "onTrack")
    const behind = goals.filter((g) => goalPace(g) === "behind")
    const atRisk = goals.filter((g) => goalPace(g) === "atRisk")
    const avg =
        goals.reduce((sum, g) => sum + onTrackFraction(g), 0) / goals.length
    const pct = Math.round(avg * 100)
    const tone = behind.length === 0 ? "lime" : pct >= 50 ? "lime" : "coral"

    const lagging = behind.length > 0 ? behind : atRisk
    const worst =
        lagging.length === 0
            ? null
            : [...lagging].sort(
                  (a, b) => onTrackFraction(a) - onTrackFraction(b)
              )[0]
    const detail = worst
        ? `${goalTitle(worst)} is ${behind.length > 0 ? "behind" : "at risk"}.`
        : "Everything on track."

    return (
        <Card className="p-5">
            <Header streak={streak} />
            <View className="flex-row items-center gap-5">
                <RingChart pct={pct} label="of today" tone={tone} />
                <View className="flex-1">
                    <Text className="mb-1 text-[20px] font-semibold tracking-tight text-ink">
                        {onTrack.length} of {total} on track
                    </Text>
                    <Text className="text-[13px] text-ink-3">{detail}</Text>
                </View>
            </View>
        </Card>
    )
}
