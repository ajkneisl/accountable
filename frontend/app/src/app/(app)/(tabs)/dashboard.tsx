// Dashboard — today's goals, a habits report, competitions, and streaks. Goals are created
// and listed on the Goals tab. Data comes from the providers above the tabs.

import { Text } from "react-native"
import { useAtomValue } from "jotai"
import { userAtom } from "../../../auth"
import { useAppData } from "../../../features/common/AppData"
import { useHabits } from "../../../features/habits/HabitsData"
import { CompetitionCard } from "../../../features/dashboard/components/CompetitionCard"
import { DashboardHeader } from "../../../features/dashboard/components/DashboardHeader"
import { HabitsReportCard } from "../../../features/dashboard/components/HabitsReportCard"
import { IntegrationsSyncCard } from "../../../features/dashboard/components/IntegrationsSyncCard"
import { StreaksCard } from "../../../features/dashboard/components/StreaksCard"
import { TodayCard } from "../../../features/dashboard/components/TodayCard"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import { Card } from "../../../ui/primitives"

export default function Dashboard() {
    const user = useAtomValue(userAtom)
    const { data, loading, error, reload } = useAppData()
    const habits = useHabits()

    function refresh() {
        reload()
        habits.reload()
    }

    if (error) {
        return (
            <Screen
                refreshing={loading}
                onRefresh={refresh}
                topRight={<SettingsButton />}
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
            topRight={<SettingsButton />}
        >
            <DashboardHeader user={user} goals={data.goals} />

            <TodayCard goals={data.goals} />

            <HabitsReportCard />

            {data.topCompetition && data.competitions.length > 0 && (
                <CompetitionCard
                    competition={data.topCompetition}
                    total={data.competitions.length}
                    meID={user?.userID}
                />
            )}

            <StreaksCard
                streak={data.streak}
                history={data.history}
                goals={data.goals}
            />

            <IntegrationsSyncCard />
        </Screen>
    )
}
