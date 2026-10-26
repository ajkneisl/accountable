// Dashboard — today's goals with the goal streak, a habits report, and competitions. Goals are created
// and listed on the Goals tab. Data comes from the providers above the tabs.

import { useRef } from "react"
import { Text, View } from "react-native"
import { useAtomValue } from "jotai"
import { userAtom } from "../../../auth"
import { useAppData } from "../../../features/common/AppData"
import { useHabits } from "../../../features/habits/HabitsData"
import { CompetitionCard } from "../../../features/dashboard/components/CompetitionCard"
import { DashboardHeader } from "../../../features/dashboard/components/DashboardHeader"
import { HabitsReportCard } from "../../../features/dashboard/components/HabitsReportCard"
import { OnboardingCard } from "../../../features/dashboard/components/OnboardingCard"
import { SyncAllButton } from "../../../features/dashboard/components/SyncAllButton"
import { TodayCard } from "../../../features/dashboard/components/TodayCard"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import { Card } from "../../../ui/primitives"

/** Sync beside the gear, so every source can be pulled in from home. */
function DashboardActions() {
    return (
        <View className="flex-row gap-2.5">
            <SyncAllButton />
            <SettingsButton />
        </View>
    )
}

export default function Dashboard() {
    const user = useAtomValue(userAtom)
    const { data, loading, error, reload } = useAppData()
    const habits = useHabits()

    // The payload starts out empty, so only call it empty once it has loaded;
    // a later pull-to-refresh keeps what's already known.
    const loadedOnce = useRef(false)
    if (!loading) loadedOnce.current = true
    const allGoals = [...data.goals, ...data.competitionGoals]
    const fresh =
        loadedOnce.current &&
        allGoals.length === 0 &&
        habits.data !== null &&
        habits.data.habits.length === 0

    function refresh() {
        reload()
        habits.reload()
    }

    if (error) {
        return (
            <Screen
                refreshing={loading}
                onRefresh={refresh}
                topRight={<DashboardActions />}
            >
                <Card className="bg-coral-soft p-4">
                    <Text className="text-[13px] text-coral-ink">{error}</Text>
                </Card>
            </Screen>
        )
    }

    return (
        <Screen
            refreshing={loading}
            onRefresh={refresh}
            topRight={<DashboardActions />}
        >
            <DashboardHeader user={user} />

            {fresh ? (
                <OnboardingCard />
            ) : (
                <>
                    {/* Competition goals count as your own, as on the Goals tab. */}
                    <TodayCard goals={allGoals} streak={data.streak} />
                    <HabitsReportCard />
                </>
            )}

            {data.topCompetition && data.competitions.length > 0 && (
                <CompetitionCard
                    competition={data.topCompetition}
                    total={data.competitions.length}
                    meID={user?.userID}
                />
            )}
        </Screen>
    )
}
