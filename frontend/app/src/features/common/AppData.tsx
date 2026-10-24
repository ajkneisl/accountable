// Shared authenticated-app state — the native counterpart of web's AppShell.
//
// On web the shell renders the sidebar and an <Outlet />, so the dashboard fetch
// survives navigation. Here the equivalent is a provider mounted above the tab
// navigator: the tabs swap underneath it, so goals/competitions/integrations are
// fetched once and shared, and the goal sheets can be opened from any tab.

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
    type GoalColor,
    type IntegrationStatus,
    type Workout,
    deleteGoal,
    getDashboard,
    updateGoal,
    useApi
} from "@shared/index"
import { EditGoalSheet } from "../dashboard/components/EditGoalSheet"
import { NewGoalSheet } from "../dashboard/components/NewGoalSheet"
import { goalKey } from "../dashboard/types"

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
    /** Open the edit sheet (target, color, delete) for the goal with [key] (see goalKey). */
    openEditGoal: (key: string) => void
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
    const [editGoalKey, setEditGoalKey] = useState<string | null>(null)

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
    const openEditGoal = useCallback((key: string) => setEditGoalKey(key), [])
    const closeEditGoal = useCallback(() => setEditGoalKey(null), [])
    const editing =
        editGoalKey !== null
            ? data.goals.find((g) => goalKey(g) === editGoalKey)
            : undefined

    // Changes apply to the cached goals right away; the reload then catches up
    // the streak and history, which depend on every goal's target.
    const saveGoal = useCallback(
        async (goal: Goal, target: number, color: GoalColor) => {
            const updated = await updateGoal(
                api,
                goal.integration,
                goal.metric,
                goal.period,
                { target, color }
            )
            setData((prev) => ({
                ...prev,
                goals: prev.goals.map((g) =>
                    goalKey(g) === goalKey(goal) ? updated : g
                )
            }))
            reload()
        },
        [api, reload]
    )

    const removeGoal = useCallback(
        async (goal: Goal) => {
            await deleteGoal(api, goal.integration, goal.metric, goal.period)
            setData((prev) => ({
                ...prev,
                goals: prev.goals.filter((g) => goalKey(g) !== goalKey(goal))
            }))
            reload()
        },
        [api, reload]
    )

    const value = useMemo(
        () => ({ data, loading, error, reload, openNewGoal, openEditGoal }),
        [data, loading, error, reload, openNewGoal, openEditGoal]
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
            {editing && (
                <EditGoalSheet
                    key={goalKey(editing)}
                    goal={editing}
                    onClose={closeEditGoal}
                    onSave={(target, color) => saveGoal(editing, target, color)}
                    onDelete={() => removeGoal(editing)}
                />
            )}
        </AppDataContext.Provider>
    )
}
