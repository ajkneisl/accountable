// Greeting at the top of the dashboard. Goal status lives in TodayCard.

import { View } from "react-native"
import type { SelfResponse } from "@shared/index"
import { Display } from "../../../ui/primitives"

export function DashboardHeader({ user }: { user: SelfResponse | null }) {
    return (
        <View className="gap-1.5 pr-24">
            <Display size={32}>Hey {user?.username ?? "there"}.</Display>
        </View>
    )
}
