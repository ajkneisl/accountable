// Dashboard — logged-in view: today's progress + goals + activity.
// Hydrates entirely from the backend via useDashboardData.

import { useAtomValue } from "jotai"
import { useSignOut, userAtom } from "../../auth"
import { Sidebar } from "../common/Sidebar"
import { ActivityPanel } from "./components/ActivityPanel"
import { CompetitionCard } from "./components/CompetitionCard"
import { DashboardHeader } from "./components/DashboardHeader"
import { GoalsSection } from "./components/GoalsSection"
import { StreaksCard } from "./components/StreaksCard"
import { TodayCard } from "./components/TodayCard"
import { useDashboardData } from "./useDashboardData"

export default function Dashboard() {
    const signOut = useSignOut()
    const user = useAtomValue(userAtom)
    const { data, loading, error } = useDashboardData()

    if (loading) {
        return (
            <main className="acc flex min-h-screen items-center justify-center">
                <p className="text-ink-3">Loading…</p>
            </main>
        )
    }

    if (error) {
        return (
            <main className="acc flex min-h-screen items-center justify-center">
                <p className="text-coral-ink">{error}</p>
            </main>
        )
    }

    return (
        <div className="acc mx-auto flex min-h-[1000px] w-[1440px]">
            <Sidebar
                onSignOut={signOut}
                user={user}
                goals={data.goals}
                streak={data.streak}
                competitions={data.competitions}
            />

            <main className="flex-1 px-9 py-7">
                <DashboardHeader user={user} goals={data.goals} />

                <div className="mb-7 grid grid-cols-3 gap-4">
                    <TodayCard goals={data.goals} />
                    <StreaksCard
                        streak={data.streak}
                        history={data.history}
                        goals={data.goals}
                    />
                    <CompetitionCard competition={data.topCompetition} />
                </div>

                <GoalsSection goals={data.goals} />
            </main>

            <ActivityPanel goals={data.goals} />
        </div>
    )
}
