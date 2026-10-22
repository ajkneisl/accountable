// Authenticated area — the native counterpart of web's <RequireAuth> + <AppShell>.
//
// Everything below this layout can assume a signed-in user and a live
// AppDataProvider, so the dashboard payload is fetched once and shared by the
// tabs and the detail screens pushed on top of them.

import { Redirect, Stack } from "expo-router"
import { useAtomValue } from "jotai"
import { isAuthenticatedAtom } from "../../auth"
import { AppDataProvider } from "../../features/common/AppData"
import { CompetitionsWidgetSync } from "../../features/competition/widget/CompetitionsWidgetSync"
import { GoalsWidgetSync } from "../../features/dashboard/widget/GoalsWidgetSync"
import { HabitsProvider } from "../../features/habits/HabitsData"
import { AppleHealthProvider } from "../../features/health/AppleHealthData"

export default function AppLayout() {
    const authed = useAtomValue(isAuthenticatedAtom)

    if (!authed) return <Redirect href="/welcome" />

    return (
        <AppDataProvider>
            <CompetitionsWidgetSync />
            <GoalsWidgetSync />
            <AppleHealthProvider>
                <HabitsProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen
                            name="competition/[id]"
                            options={{ presentation: "card" }}
                        />
                        <Stack.Screen name="integrations/[name]" />
                        <Stack.Screen name="settings" />
                    </Stack>
                </HabitsProvider>
            </AppleHealthProvider>
        </AppDataProvider>
    )
}
