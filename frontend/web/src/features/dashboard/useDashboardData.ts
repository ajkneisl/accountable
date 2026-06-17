// Fetches every piece of backend state the dashboard renders, in parallel.

import { useEffect, useRef, useState } from "react"
import { useAtom } from "jotai"
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
import { refreshOnLoadAtom } from "../../auth"

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
    const [refreshOnLoad, setRefreshOnLoad] = useAtom(refreshOnLoadAtom)
    // Set the instant the refresh starts so React's StrictMode (which runs
    // effects twice in dev) can't kick off a second one.
    const refreshStarted = useRef(false)

    // When login asked for it, pull fresh data for every connected integration
    // in the background, then reload so the dashboard shows the new numbers.
    // Runs once; clearing the flag means a later page reload won't repeat it.
    useEffect(() => {
        if (!refreshOnLoad || refreshStarted.current) return
        refreshStarted.current = true
        setRefreshOnLoad(false)
        ;(async () => {
            try {
                const enabled = (await listIntegrations(api)).filter(
                    (it) => it.enabled
                )
                if (enabled.length === 0) return
                await Promise.allSettled(
                    enabled.map((it) => getIntegration(api, it.name))
                )
                setTick((n) => n + 1)
            } catch {
                // Best-effort; the per-integration refresh button still works.
            }
        })()
    }, [refreshOnLoad, api, setRefreshOnLoad])

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
