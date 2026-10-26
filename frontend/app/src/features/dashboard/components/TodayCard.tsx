// Goals card — today's progress ring, on-track breakdown, and the goal streak count.
// Renders nothing until there's a goal.

import { Text, View } from "react-native"
import type { Goal } from "@shared/index"
import { Card, Eyebrow, RingChart } from "../../../ui/primitives"
import { goalPace, goalTitle, onTrackFraction } from "../types"
import { StreakFigure } from "./StreaksCard"

export function TodayCard({
    goals,
    streak
}: {
    goals: Goal[]
    streak: number
}) {
    const total = goals.length

    // Hidden until there's a goal; the dashboard shows onboarding instead.
    if (total === 0) return null

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
            <Eyebrow className="mb-1.5">Goals</Eyebrow>
            {/* Pinned to the corner, where the other cards' figures sit, so it
                doesn't heighten the header and push the ring down. */}
            <View className="absolute right-5 top-5">
                <StreakFigure streak={streak} />
            </View>
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
