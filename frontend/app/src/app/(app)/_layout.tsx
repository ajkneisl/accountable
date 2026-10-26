// Authenticated area — the native counterpart of web's <RequireAuth> + <AppShell>.
//
// Everything below this layout can assume a signed-in user and a live
// AppDataProvider, so the dashboard payload is fetched once and shared by the
// tabs and the detail screens pushed on top of them.

import { useEffect } from "react"
import { Redirect, Stack } from "expo-router"
import { useAtomValue } from "jotai"
import { useApi } from "@shared/index"
import { isAuthenticatedAtom } from "../../auth"
import { AppDataProvider } from "../../features/common/AppData"
import { CompetitionsWidgetSync } from "../../features/competition/widget/CompetitionsWidgetSync"
import { GoalsWidgetSync } from "../../features/dashboard/widget/GoalsWidgetSync"
import { HabitsProvider } from "../../features/habits/HabitsData"
import { AppleHealthProvider } from "../../features/health/AppleHealthData"
import { registerBackgroundSync } from "../../features/integration/backgroundSync"
import {
    enablePushes,
    useNotificationRouting
} from "../../features/notifications/notifications"
import { ScreenTimeProvider } from "../../features/screenTime/ScreenTimeData"

export default function AppLayout() {
    const api = useApi()
    const authed = useAtomValue(isAuthenticatedAtom)

    useEffect(() => {
        if (!authed) return
        void registerBackgroundSync()
        // Asks the first time someone signs in; settings can turn them on later.
        void enablePushes(api, true).catch(() => {})
    }, [api, authed])

    useNotificationRouting()

    if (!authed) return <Redirect href="/welcome" />

    return (
        <AppDataProvider>
            <CompetitionsWidgetSync />
            <GoalsWidgetSync />
            <AppleHealthProvider>
                <ScreenTimeProvider>
                    <HabitsProvider>
                        <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="(tabs)" />
                            <Stack.Screen
                                name="competition/[id]/index"
                                options={{ presentation: "card" }}
                            />
                            <Stack.Screen name="competition/[id]/settings" />
                            <Stack.Screen name="integrations/[name]" />
                            <Stack.Screen name="settings" />
                        </Stack>
                    </HabitsProvider>
                </ScreenTimeProvider>
            </AppleHealthProvider>
        </AppDataProvider>
    )
}
