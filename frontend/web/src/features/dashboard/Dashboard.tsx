// Dashboard — logged-in view: today's progress + goals + activity.
// Hydrates entirely from the backend via useDashboardData.

import { useState } from "react"
import { useAtomValue } from "jotai"
import { useSignOut, userAtom } from "../../auth"
import { Sidebar } from "../common/Sidebar"
import { AddWorkoutDialog } from "./components/AddWorkoutDialog"
import { DashboardHeader } from "./components/DashboardHeader"
import { GoalsSection } from "./components/GoalsSection"
import { ManageIntegrationsDialog } from "./components/ManageIntegrationsDialog"
import { NewGoalDialog } from "./components/NewGoalDialog"
import { StreaksCard } from "./components/StreaksCard"
import { TodayCard } from "./components/TodayCard"
import { WorkoutCard } from "./components/WorkoutCard"
import { useDashboardData } from "./useDashboardData"

export default function Dashboard() {
    const signOut = useSignOut()
    const user = useAtomValue(userAtom)
    const { data, loading, error, reload } = useDashboardData()
    const [newGoalOpen, setNewGoalOpen] = useState(false)
    const [integrationsOpen, setIntegrationsOpen] = useState(false)
    const [addWorkoutOpen, setAddWorkoutOpen] = useState(false)
    const openNewGoal = () => setNewGoalOpen(true)
    const openIntegrations = () => setIntegrationsOpen(true)
    const openAddWorkout = () => setAddWorkoutOpen(true)

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
                onNewGoal={openNewGoal}
                user={user}
                goals={data.goals}
                streak={data.streak}
                competitions={data.competitions}
                loading={loading}
            />

            <main className="flex-1 px-9 py-7">
                <DashboardHeader
                    user={user}
                    goals={data.goals}
                    onNewGoal={openNewGoal}
                    onManageIntegrations={openIntegrations}
                />

                <div className="mb-7 grid grid-cols-2 gap-4">
                    <TodayCard goals={data.goals} />

                    <StreaksCard
                        streak={data.streak}
                        history={data.history}
                        goals={data.goals}
                    />
                </div>

                <div className="mb-7">
                    <WorkoutCard
                        workouts={data.workouts}
                        onAdd={openAddWorkout}
                        onChanged={reload}
                        loading={loading}
                    />
                </div>

                <GoalsSection
                    goals={data.goals}
                    onNewGoal={openNewGoal}
                    loading={loading}
                />
            </main>

            {newGoalOpen && (
                <NewGoalDialog
                    onClose={() => setNewGoalOpen(false)}
                    onCreated={reload}
                />
            )}

            {integrationsOpen && (
                <ManageIntegrationsDialog
                    onClose={() => setIntegrationsOpen(false)}
                    onChanged={reload}
                />
            )}

            {addWorkoutOpen && (
                <AddWorkoutDialog
                    onClose={() => setAddWorkoutOpen(false)}
                    onCreated={reload}
                />
            )}
        </div>
    )
}
