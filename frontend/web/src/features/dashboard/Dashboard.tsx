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
        <div
            className="acc"
            style={{
                width: 1440,
                margin: "0 auto",
                minHeight: 1000,
                display: "flex"
            }}
        >
            <Sidebar onSignOut={signOut} />

            <main style={{ flex: 1, padding: "28px 36px" }}>
                <DashboardHeader />

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 16,
                        marginBottom: 28
                    }}
                >
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
