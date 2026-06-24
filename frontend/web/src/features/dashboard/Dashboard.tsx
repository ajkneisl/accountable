// Dashboard — logged-in view: today's progress + goals + activity.
// Data + sidebar come from the persistent AppShell; this renders only the main column.

import { useAtomValue } from "jotai"
import { userAtom } from "../../auth"
import { useAppData } from "../common/AppShell"
import { DashboardHeader } from "./components/DashboardHeader"
import { GoalsSection } from "./components/GoalsSection"
import { IntegrationsSyncCard } from "./components/IntegrationsSyncCard"
import { StreaksCard } from "./components/StreaksCard"
import { TodayCard } from "./components/TodayCard"

export default function Dashboard() {
    const user = useAtomValue(userAtom)
    const { data, loading, error, openNewGoal } = useAppData()

    if (error) {
        return (
            <main className="flex-1 px-9 py-7">
                <p className="text-coral-ink">{error}</p>
            </main>
        )
    }

    return (
        <main className="flex-1 px-9 py-7">
            <DashboardHeader
                user={user}
                goals={data.goals}
                onNewGoal={openNewGoal}
            />

            <IntegrationsSyncCard />

            <div className="mb-7 grid grid-cols-2 gap-4">
                <TodayCard goals={data.goals} />

                <StreaksCard
                    streak={data.streak}
                    history={data.history}
                    goals={data.goals}
                />
            </div>

            <GoalsSection
                goals={data.goals}
                onNewGoal={openNewGoal}
                loading={loading}
            />
        </main>
    )
}
