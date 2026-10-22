// Compact integrations status: when each connected source last refreshed, plus a
// one-tap "Refresh all". Full management lives in Settings.

import { useState } from "react"
import { Text, View } from "react-native"
import { refreshAllIntegrations, useApi } from "@shared/index"
import {
    Button,
    Card,
    Eyebrow,
    IntegrationIcon,
    SourceTile
} from "../../../ui/primitives"
import { useAppData } from "../../common/AppData"
import { formatRefreshed, integrationVisual } from "../types"

export function IntegrationsSyncCard() {
    const api = useApi()
    const { data, reload } = useAppData()
    const [busy, setBusy] = useState(false)

    const connected = data.integrations.filter((it) => it.enabled)
    if (connected.length === 0) return null

    async function refreshAll() {
        setBusy(true)
        try {
            await refreshAllIntegrations(api)
            reload()
        } catch {
            // best-effort; Settings surfaces per-integration detail
        } finally {
            setBusy(false)
        }
    }

    return (
        <Card className="gap-3 p-4">
            <View className="flex-row items-center justify-between">
                <Eyebrow>Synced</Eyebrow>
                <Button
                    label={busy ? "Refreshing…" : "↻ Refresh all"}
                    variant="line"
                    size="sm"
                    onPress={refreshAll}
                    busy={busy}
                />
            </View>
            <View className="flex-row flex-wrap gap-x-5 gap-y-2">
                {connected.map((it) => {
                    const visual = integrationVisual(it.name)
                    return (
                        <View
                            key={it.name}
                            className="flex-row items-center gap-2"
                        >
                            <SourceTile
                                size="sm"
                                label={visual.glyph}
                                variant={visual.tile}
                                icon={
                                    <IntegrationIcon name={it.name} size={16} />
                                }
                            />
                            <View>
                                <Text className="text-xs font-semibold text-ink">
                                    {visual.sourceLabel}
                                </Text>
                                <Text className="text-[11px] text-ink-3">
                                    {it.lastFetched
                                        ? formatRefreshed(it.lastFetched)
                                        : "never refreshed"}
                                </Text>
                            </View>
                        </View>
                    )
                })}
            </View>
        </Card>
    )
}
