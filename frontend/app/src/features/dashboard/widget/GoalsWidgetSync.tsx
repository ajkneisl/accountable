// Keeps the GoalsProgress home screen widget current. Mounted once under
// AppDataProvider: it re-syncs whenever the shared dashboard payload reloads
// (new goal, pull to refresh), and refetches the goals on every return to the
// foreground, so new progress and a new day reach the widget even if the Goals
// tab is never opened. Renders nothing.

import { useEffect } from "react"
import { AppState } from "react-native"
import { listGoals, useApi } from "@shared/index"
import { useAppData } from "../../common/AppData"
import { syncGoalsWidget } from "./sync"

export function GoalsWidgetSync() {
    const api = useApi()
    const { data, loading, error } = useAppData()
    const ready = !loading && error === null

    useEffect(() => {
        if (ready) syncGoalsWidget(data.goals)
    }, [data.goals, ready])

    useEffect(() => {
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active")
                listGoals(api)
                    .then(syncGoalsWidget)
                    .catch(() => {})
        })
        return () => sub.remove()
    }, [api])

    return null
}
