// Summary card — today's progress ring and on-track breakdown.

import { Text, View } from "react-native"
import { router } from "expo-router"
import type { Goal } from "@shared/index"
import { colors } from "../../../theme"
import {
    Button,
    Card,
    Chip,
    Dot,
    Eyebrow,
    RingChart
} from "../../../ui/primitives"
import { goalTitle, isOnTrack, onTrackFraction } from "../types"

export function TodayCard({ goals }: { goals: Goal[] }) {
    const total = goals.length

    if (total === 0) {
        return (
            <Card className="flex-row items-center gap-5 p-5">
                <RingChart pct={0} label="of today" tone="lime" />
                <View className="flex-1">
                    <Eyebrow className="mb-1.5">Today</Eyebrow>
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
            </Card>
        )
    }

    const onTrack = goals.filter((g) => isOnTrack(g))
    const behind = goals.filter((g) => !isOnTrack(g))
    const avg =
        goals.reduce((sum, g) => sum + onTrackFraction(g), 0) / goals.length
    const pct = Math.round(avg * 100)
    const tone = behind.length === 0 ? "lime" : pct >= 50 ? "lime" : "coral"

    const worst =
        behind.length === 0
            ? null
            : [...behind].sort(
                  (a, b) => onTrackFraction(a) - onTrackFraction(b)
              )[0]
    const detail = worst
        ? `${goalTitle(worst)} is behind.`
        : "Everything on track."

    return (
        <Card className="flex-row items-center gap-5 p-5">
            <RingChart pct={pct} label="of today" tone={tone} />
            <View className="flex-1">
                <Eyebrow className="mb-1.5">Today</Eyebrow>
                <Text className="mb-1 text-[20px] font-semibold tracking-tight text-ink">
                    {onTrack.length} of {total} on track
                </Text>
                <Text className="mb-3 text-[13px] text-ink-3">{detail}</Text>
                <View className="flex-row flex-wrap gap-2">
                    <Chip className="bg-lime-soft">
                        <Dot color={colors.lime} />
                        <Text className="text-xs font-medium text-lime-ink">
                            {onTrack.length} good
                        </Text>
                    </Chip>
                    {behind.length > 0 && (
                        <Chip className="bg-coral-soft">
                            <Dot color={colors.coral} />
                            <Text className="text-xs font-medium text-coral-ink">
                                {behind.length} behind
                            </Text>
                        </Chip>
                    )}
                </View>
            </View>
        </Card>
    )
}
