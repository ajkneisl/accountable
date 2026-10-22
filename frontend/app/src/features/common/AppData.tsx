// Shared authenticated-app state — the native counterpart of web's AppShell.
//
// On web the shell renders the sidebar and an <Outlet />, so the dashboard fetch
// survives navigation. Here the equivalent is a provider mounted above the tab
// navigator: the tabs swap underneath it, so goals/competitions/integrations are
// fetched once and shared, and the "new goal" sheet can be opened from any tab.

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode
} from "react"
import {
    type CompetitionDetail,
    type CompetitionSummary,
    type DayStatus,
    type Goal,
    type IntegrationStatus,
    type Workout,
    getDashboard,
    useApi
} from "@shared/index"
import { NewGoalSheet } from "../dashboard/components/NewGoalSheet"

export interface DashboardData {
    goals: Goal[]
    streak: number
    history: DayStatus[]
    competitions: CompetitionSummary[]
    topCompetition: CompetitionDetail | null
    workouts: Workout[]
    integrations: IntegrationStatus[]
}

const EMPTY: DashboardData = {
    goals: [],
    streak: 0,
    history: [],
    competitions: [],
    topCompetition: null,
    workouts: [],
    integrations: []
}

interface AppData {
    data: DashboardData
    loading: boolean
    error: string | null
    /** Re-fetch all shared data (goals, competitions, integrations, workouts…). */
    reload: () => void
    /** Open the global "new goal" sheet from anywhere in the tab stack. */
    openNewGoal: () => void
}

const AppDataContext = createContext<AppData | null>(null)

/** Access the shared dashboard data + actions provided by [AppDataProvider]. */
export function useAppData(): AppData {
    const ctx = useContext(AppDataContext)
    if (!ctx) {
        throw new Error("useAppData must be used within <AppDataProvider>")
    }
    return ctx
}

export function AppDataProvider({ children }: { children: ReactNode }) {
    const api = useApi()
    const [data, setData] = useState<DashboardData>(EMPTY)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [tick, setTick] = useState(0)
    const [newGoalOpen, setNewGoalOpen] = useState(false)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        ;(async () => {
            try {
                // One request for the whole dashboard (see GET /api/dashboard).
                const d = await getDashboard(api)
                if (cancelled) return
                setData(d)
            } catch (err) {
                if (cancelled) return
                setError(err instanceof Error ? err.message : "failed to load")
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [api, tick])

    const reload = useCallback(() => setTick((n) => n + 1), [])
    const openNewGoal = useCallback(() => setNewGoalOpen(true), [])

    const value = useMemo(
        () => ({ data, loading, error, reload, openNewGoal }),
        [data, loading, error, reload, openNewGoal]
    )

    return (
        <AppDataContext.Provider value={value}>
            {children}
            {newGoalOpen && (
                <NewGoalSheet
                    onClose={() => setNewGoalOpen(false)}
                    onCreated={reload}
                />
            )}
        </AppDataContext.Provider>
    )
}
