// Greeting at the top of the dashboard.

import { Text, View } from "react-native"
import type { Goal, SelfResponse } from "@shared/index"
import { Display } from "../../../ui/primitives"
import { isOnTrack } from "../types"

export function DashboardHeader({
    user,
    goals
}: {
    user: SelfResponse | null
    goals: Goal[]
}) {
    const onTrack = goals.filter((g) => isOnTrack(g)).length
    const status =
        goals.length === 0
            ? "No goals yet."
            : onTrack === goals.length
              ? "Every goal is on track."
              : `${onTrack} of ${goals.length} goals on track.`

    return (
        <View className="gap-1.5 pr-12">
            <Display size={32}>Hey {user?.username ?? "there"}.</Display>
            <Text className="text-[15px] text-ink-3">{status}</Text>
        </View>
    )
}
