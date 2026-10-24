// Top-right sync on the dashboard, beside the gear: refreshes every linked
// account on the server and pulls Apple Health and Screen Time from the phone,
// then reloads the dashboard. Each source is best-effort — one failing doesn't
// stop the rest, and Settings shows per-source detail.

import { useState } from "react"
import { ActivityIndicator } from "react-native"
import { refreshAllIntegrations, useApi } from "@shared/index"
import { colors } from "../../../theme"
import { CircleButton } from "../../../ui/CircleButton"
import { RefreshIcon } from "../../../ui/icons"
import { useAppData } from "../../common/AppData"
import { useHabits } from "../../habits/HabitsData"
import { useAppleHealth } from "../../health/AppleHealthData"
import { useScreenTime } from "../../screenTime/ScreenTimeData"

export function SyncAllButton() {
    const api = useApi()
    const { reload } = useAppData()
    const habits = useHabits()
    const health = useAppleHealth()
    const screenTime = useScreenTime()
    const [syncing, setSyncing] = useState(false)

    async function syncAll() {
        setSyncing(true)
        try {
            await Promise.allSettled([
                refreshAllIntegrations(api),
                health.connected ? health.syncNow() : undefined,
                screenTime.connected ? screenTime.syncNow() : undefined
            ])
            reload()
            habits.reload()
        } finally {
            setSyncing(false)
        }
    }

    return (
        <CircleButton label="Sync all" onPress={syncAll} disabled={syncing}>
            {(glass) =>
                syncing ? (
                    <ActivityIndicator color={colors.ink2} />
                ) : glass ? (
                    <RefreshIcon color={colors.ink} size={21} />
                ) : (
                    <RefreshIcon color={colors.ink2} size={20} />
                )
            }
        </CircleButton>
    )
}
