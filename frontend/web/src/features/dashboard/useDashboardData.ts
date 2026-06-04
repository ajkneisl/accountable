// Fetches every piece of backend state the dashboard renders, in parallel.

import { useEffect, useState } from "react"
import {
    type CompetitionDetail,
    type CompetitionSummary,
    type DayStatus,
    type Goal,
    type Workout,
    getCompetition,
    getStreak,
    getStreakHistory,
    listCompetitions,
    listGoals,
    listWorkouts,
    useApi
} from "@shared/index"

export interface DashboardData {
    goals: Goal[]
    streak: number
    history: DayStatus[]
    competitions: CompetitionSummary[]
    topCompetition: CompetitionDetail | null
    workouts: Workout[]
}

const EMPTY: DashboardData = {
    goals: [],
    streak: 0,
    history: [],
    competitions: [],
    topCompetition: null,
    workouts: []
}

export function useDashboardData(): {
    data: DashboardData
    loading: boolean
    error: string | null
    reload: () => void
} {
    const api = useApi()
    const [data, setData] = useState<DashboardData>(EMPTY)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [tick, setTick] = useState(0)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        ;(async () => {
            try {
                const [goals, streakResp, historyResp, competitions, workouts] =
                    await Promise.all([
                        listGoals(api),
                        getStreak(api),
                        getStreakHistory(api, 14),
                        listCompetitions(api),
                        listWorkouts(api)
                    ])
                let topCompetition: CompetitionDetail | null = null
                if (competitions.length > 0) {
                    topCompetition = await getCompetition(
                        api,
                        competitions[0].id
                    )
                }
                if (cancelled) return
                setData({
                    goals,
                    streak: streakResp.streak,
                    history: historyResp.days,
                    competitions,
                    topCompetition,
                    workouts
                })
            } catch (err) {
                if (cancelled) return
                setError(
                    err instanceof Error ? err.message : "failed to load"
                )
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [api, tick])

    return { data, loading, error, reload: () => setTick((n) => n + 1) }
}
