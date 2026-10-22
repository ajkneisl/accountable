// Keeps the CompetitionStandings home screen widget current. Mounted once under
// AppDataProvider: it re-syncs whenever the shared competition list reloads
// (create, join, leave, pull to refresh) and on every return to the foreground,
// so new progress and a new week reach the widget even if the Competitions tab
// is never opened. Renders nothing.

import { useEffect } from "react"
import { AppState } from "react-native"
import { useAtomValue } from "jotai"
import { useApi } from "@shared/index"
import { userAtom } from "../../../auth"
import { useAppData } from "../../common/AppData"
import { syncCompetitionsWidget } from "./sync"

export function CompetitionsWidgetSync() {
    const api = useApi()
    const { data, loading, error } = useAppData()
    const meID = useAtomValue(userAtom)?.userID
    const ready = !loading && error === null

    useEffect(() => {
        if (!ready) return
        void syncCompetitionsWidget(api, data.competitions, meID)

        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active")
                void syncCompetitionsWidget(api, data.competitions, meID)
        })
        return () => sub.remove()
    }, [api, data.competitions, meID, ready])

    return null
}
