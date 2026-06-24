// Persistent authenticated app shell.
//
// Owns the dashboard data fetch and the Sidebar, and renders the active page through an
// <Outlet />. Because this element stays mounted while only the outlet swaps, the sidebar
// (and its data) survives navigation between pages — no refetch or flash when moving around.

import { createContext, useContext, useState } from "react"
import { useAtomValue } from "jotai"
import { Outlet } from "react-router-dom"
import { useSignOut, userAtom } from "../../auth"
import { NewGoalDialog } from "../dashboard/components/NewGoalDialog"
import {
    type DashboardData,
    useDashboardData
} from "../dashboard/useDashboardData"
import { Sidebar } from "./Sidebar"

interface AppData {
    data: DashboardData
    loading: boolean
    error: string | null
    /** Re-fetch all shared data (goals, competitions, integrations, workouts…). */
    reload: () => void
    /** Open the global "new goal" dialog from anywhere in the shell. */
    openNewGoal: () => void
}

const AppDataContext = createContext<AppData | null>(null)

/** Access the shared dashboard data + actions provided by [AppShell]. */
export function useAppData(): AppData {
    const ctx = useContext(AppDataContext)
    if (!ctx) throw new Error("useAppData must be used within <AppShell>")
    return ctx
}

export function AppShell() {
    const signOut = useSignOut()
    const user = useAtomValue(userAtom)
    const { data, loading, error, reload } = useDashboardData()
    const [newGoalOpen, setNewGoalOpen] = useState(false)

    const openNewGoal = () => setNewGoalOpen(true)

    return (
        <AppDataContext.Provider
            value={{ data, loading, error, reload, openNewGoal }}
        >
            <div className="acc mx-auto flex min-h-[1000px] w-[1440px]">
                <Sidebar
                    onSignOut={signOut}
                    onNewGoal={openNewGoal}
                    onReload={reload}
                    user={user}
                    goals={data.goals}
                    streak={data.streak}
                    competitions={data.competitions}
                    loading={loading}
                />
                <Outlet />
            </div>

            {newGoalOpen && (
                <NewGoalDialog
                    onClose={() => setNewGoalOpen(false)}
                    onCreated={reload}
                />
            )}
        </AppDataContext.Provider>
    )
}
