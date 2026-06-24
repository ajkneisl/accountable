// Fetches every piece of backend state the dashboard renders, in parallel.

import { useEffect, useState } from "react"
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

    return { data, loading, error, reload: () => setTick((n) => n + 1) }
}
