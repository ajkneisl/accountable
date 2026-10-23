// Habit state for the signed-in app. Mounted above the tab navigator (next to
// AppDataProvider) rather than inside the Habits tab, so the home screen widget
// is refreshed on launch and on every return to the foreground even when the
// tab is never opened — that's what rolls the widget over to a new day.

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode
} from "react"
import { AppState } from "react-native"
import {
    type HabitColor,
    type HabitsResponse,
    createHabit,
    deleteHabit,
    listHabits,
    setHabitCheckin,
    updateHabit,
    useApi
} from "@shared/index"
import { HabitSheet } from "./components/HabitSheet"
import { syncHabitsWidget } from "./widget/sync"

/** Heatmap window: 26 weeks, enough to fill the widest heatmap with history. */
export const HABIT_DAYS = 182

interface HabitsData {
    data: HabitsResponse | null
    loading: boolean
    error: string | null
    reload: () => void
    /** Mark [habitID] done or not on [date] (`yyyy-MM-dd`). Applied optimistically. */
    toggle: (habitID: string, date: string, done: boolean) => void
    create: (name: string, color: HabitColor) => Promise<void>
    update: (habitID: string, name: string, color: HabitColor) => Promise<void>
    remove: (habitID: string) => Promise<void>
    openNewHabit: () => void
    /** Open the edit sheet (rename, recolor, delete) for [habitID]. */
    openEditHabit: (habitID: string) => void
}

const HabitsContext = createContext<HabitsData | null>(null)

export function useHabits(): HabitsData {
    const ctx = useContext(HabitsContext)
    if (!ctx) throw new Error("useHabits must be used within <HabitsProvider>")
    return ctx
}

function message(err: unknown): string {
    return err instanceof Error ? err.message : "Something went wrong"
}

/** Days between two `yyyy-MM-dd` dates. */
function daysBetween(from: string, to: string): number {
    return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

export function HabitsProvider({ children }: { children: ReactNode }) {
    const api = useApi()
    const [data, setData] = useState<HabitsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // `quiet` refetches (on returning to the app) skip the loading spinner.
    const [tick, setTick] = useState({ n: 0, quiet: false })
    // Which habit sheet is up: `null` habitID for a new habit.
    const [sheet, setSheet] = useState<{ habitID: string | null } | null>(null)

    useEffect(() => {
        let cancelled = false
        if (!tick.quiet) setLoading(true)
        ;(async () => {
            try {
                const d = await listHabits(api, HABIT_DAYS)
                if (cancelled) return
                setData(d)
                setError(null)
            } catch (err) {
                if (!cancelled) setError(message(err))
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [api, tick])

    const reload = useCallback(
        () => setTick((t) => ({ n: t.n + 1, quiet: false })),
        []
    )

    // Coming back to the app may mean a new day; refetch so "today" moves.
    useEffect(() => {
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active")
                setTick((t) => ({ n: t.n + 1, quiet: true }))
        })
        return () => sub.remove()
    }, [])

    useEffect(() => {
        if (data) syncHabitsWidget(data)
    }, [data])

    const toggle = useCallback(
        (habitID: string, date: string, done: boolean) => {
            setData((prev) => {
                if (!prev) return prev
                const index = daysBetween(prev.start, date)
                return {
                    ...prev,
                    habits: prev.habits.map((h) => {
                        if (h.id !== habitID || h.done[index] === done) return h
                        const next = [...h.done]
                        next[index] = done
                        return {
                            ...h,
                            done: next,
                            total: h.total + (done ? 1 : -1)
                        }
                    })
                }
            })
            setHabitCheckin(api, habitID, date, done, HABIT_DAYS)
                .then(setData)
                .catch((err) => {
                    setError(message(err))
                    reload()
                })
        },
        [api, reload]
    )

    const create = useCallback(
        async (name: string, color: HabitColor) => {
            setData(await createHabit(api, { name, color }, HABIT_DAYS))
        },
        [api]
    )

    const update = useCallback(
        async (habitID: string, name: string, color: HabitColor) => {
            setData(
                await updateHabit(api, habitID, { name, color }, HABIT_DAYS)
            )
        },
        [api]
    )

    const remove = useCallback(
        async (habitID: string) => {
            await deleteHabit(api, habitID)
            setData(
                (prev) =>
                    prev && {
                        ...prev,
                        habits: prev.habits.filter((h) => h.id !== habitID)
                    }
            )
        },
        [api]
    )

    const openNewHabit = useCallback(() => setSheet({ habitID: null }), [])
    const openEditHabit = useCallback(
        (habitID: string) => setSheet({ habitID }),
        []
    )
    const closeSheet = useCallback(() => setSheet(null), [])
    const editing =
        sheet?.habitID != null
            ? data?.habits.find((h) => h.id === sheet.habitID)
            : undefined

    const value = useMemo(
        () => ({
            data,
            loading,
            error,
            reload,
            toggle,
            create,
            update,
            remove,
            openNewHabit,
            openEditHabit
        }),
        [
            data,
            loading,
            error,
            reload,
            toggle,
            create,
            update,
            remove,
            openNewHabit,
            openEditHabit
        ]
    )

    return (
        <HabitsContext.Provider value={value}>
            {children}
            {sheet?.habitID === null && (
                <HabitSheet onClose={closeSheet} onSave={create} />
            )}
            {editing && (
                <HabitSheet
                    key={editing.id}
                    habit={editing}
                    onClose={closeSheet}
                    onSave={(name, color) => update(editing.id, name, color)}
                    onDelete={() => remove(editing.id)}
                />
            )}
        </HabitsContext.Provider>
    )
}
