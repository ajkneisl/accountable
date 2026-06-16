// Fetches every piece of backend state the dashboard renders, in parallel.

import { useEffect, useRef, useState } from "react"
import {
    type CompetitionDetail,
    type CompetitionSummary,
    type DayStatus,
    type Goal,
    type IntegrationStatus,
    type Workout,
    getCompetition,
    getIntegration,
    getStreak,
    getStreakHistory,
    listCompetitions,
    listGoals,
    listIntegrations,
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

    // On login (first mount of the authenticated shell) force a fresh upstream
    // pull for every connected integration — GitHub, LeetCode, … — then reload
    // so the dashboard reflects it. Kept in its own effect, guarded by a ref so
    // neither StrictMode's double-invoke nor a later reload() re-triggers it,
    // and the reload fires unconditionally once the pulls settle.
    const loginRefreshStarted = useRef(false)
    useEffect(() => {
        if (loginRefreshStarted.current) return
        loginRefreshStarted.current = true
        ;(async () => {
            try {
                const enabled = (await listIntegrations(api)).filter(
                    (it) => it.enabled
                )
                if (enabled.length === 0) return
                await Promise.allSettled(
                    enabled.map((it) =>
                        getIntegration(api, it.name, Date.now(), true)
                    )
                )
                setTick((n) => n + 1)
            } catch {
                // Best-effort; the per-integration refresh button still works.
            }
        })()
    }, [api])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        ;(async () => {
            try {
                const [
                    goals,
                    streakResp,
                    historyResp,
                    competitions,
                    workouts,
                    integrations
                ] = await Promise.all([
                    listGoals(api),
                    getStreak(api),
                    getStreakHistory(api, 14),
                    listCompetitions(api),
                    listWorkouts(api),
                    listIntegrations(api)
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
                    workouts,
                    integrations
                })
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
