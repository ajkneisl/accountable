// Dashboard — logged-in view: today's progress + goals + activity.
// Ported from the design bundle; composed from ./components.

import { Sidebar } from "../common/Sidebar"
import { useSignOut } from "../../auth"
import { DashboardHeader } from "./components/DashboardHeader"
import { TodayCard } from "./components/TodayCard"
import { StreaksCard } from "./components/StreaksCard"
import { CompetitionCard } from "./components/CompetitionCard"
import { GoalsSection } from "./components/GoalsSection"
import { ActivityPanel } from "./components/ActivityPanel"

export default function Dashboard() {
    const signOut = useSignOut()
    return (
        <div className="acc mx-auto flex min-h-[1000px] w-[1440px]">
            <Sidebar onSignOut={signOut} />

            <main className="flex-1 px-9 py-7">
                <DashboardHeader />

                <div className="mb-7 grid grid-cols-3 gap-4">
                    <TodayCard />
                    <StreaksCard />
                    <CompetitionCard />
                </div>

                <GoalsSection />
            </main>

            <ActivityPanel />
        </div>
    )
}
