// Greeting at the top of the dashboard. Goal status lives in TodayCard.

import { Text, View } from "react-native"
import type { SelfResponse } from "@shared/index"
import { Display } from "../../../ui/primitives"

export function DashboardHeader({ user }: { user: SelfResponse | null }) {
    const date = new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
    })

    return (
        <View className="gap-1.5 pr-24">
            <Display size={32}>Hey {user?.username ?? "there"}.</Display>
            <Text className="text-[15px] text-ink-3">{date}</Text>
        </View>
    )
}
