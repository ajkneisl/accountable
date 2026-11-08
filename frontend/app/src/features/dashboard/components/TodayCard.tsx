// Goals card — a small progress ring, how many goals are on track and the goal
// streak. Tapping it opens the Goals tab. Renders nothing until there's a goal.

import { Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import type { Goal } from "@shared/index"
import { Card, RingChart } from "../../../ui/primitives"
import { goalPace, onTrackFraction } from "../types"
import { StreakFigure } from "./StreaksCard"

export function TodayCard({
    goals,
    streak
}: {
    goals: Goal[]
    streak: number
}) {
    const total = goals.length

    // Hidden until there's a goal; Home shows onboarding instead.
    if (total === 0) return null

    const paces = goals.map((goal) => goalPace(goal))
    const onTrack = paces.filter((p) => p === "onTrack").length
    const behind = paces.filter((p) => p === "behind").length
    const slipping = total - onTrack
    const avg =
        goals.reduce((sum, g) => sum + onTrackFraction(g), 0) / goals.length
    const pct = Math.round(avg * 100)
    const tone = behind === 0 ? "lime" : pct >= 50 ? "lime" : "coral"

    return (
        <Pressable
            onPress={() => router.push("/goals")}
            accessibilityRole="button"
            accessibilityLabel={`Goals: ${onTrack} of ${total} on track. Open Goals`}
        >
            <Card className="p-4">
                <View className="flex-row items-center gap-3.5">
                    <RingChart pct={pct} label="" tone={tone} size={56} />
                    <View className="flex-1">
                        <Text className="text-[17px] font-semibold tracking-tight text-ink">
                            {onTrack} of {total} on track
                        </Text>
                        <Text className="text-[13px] text-ink-3">
                            {slipping === 0
                                ? "Everything on track."
                                : `${slipping} need${slipping === 1 ? "s" : ""} attention`}
                        </Text>
                    </View>
                    <StreakFigure streak={streak} />
                </View>
            </Card>
        </Pressable>
    )
}
