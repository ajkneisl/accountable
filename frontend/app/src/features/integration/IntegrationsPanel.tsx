// Integrations tab of Settings: connect and refresh the data sources goals are
// tracked against. GitHub and LeetCode link by username, workouts and sleep
// come from Apple Health.

import { useState } from "react"
import { Text, View } from "react-native"
import { router } from "expo-router"
import {
    getIntegration,
    type IntegrationStatus,
    refreshAllIntegrations,
    useApi
} from "@shared/index"
import { useAppData } from "../common/AppData"
import {
    formatRefreshed,
    integrationVisual
} from "../dashboard/types"
import { useAppleHealth } from "../health/AppleHealthData"
import {
    Button,
    Card,
    Eyebrow,
    IconButton,
    IntegrationIcon,
    SourceTile,
    Spinner
} from "../../ui/primitives"

const APPLE_FITNESS = "apple_fitness"
const APPLE_SLEEP = "apple_sleep"
/** Fed by the Apple Health card rather than linked by username. */
const HEALTH_SOURCES = [APPLE_FITNESS, APPLE_SLEEP]

function openIntegration(name: string) {
    router.push({ pathname: "/integrations/[name]", params: { name } })
}

function IntegrationRow({
    integration,
    busy,
    onRefresh
}: {
    integration: IntegrationStatus
    busy: boolean
    onRefresh: () => void
}) {
    const visual = integrationVisual(integration.name)
    const sub = !integration.enabled
        ? "Not connected"
        : integration.lastFetched
          ? `${integration.externalID ?? "Connected"} · ${formatRefreshed(integration.lastFetched)}`
          : `${integration.externalID ?? "Connected"} · never refreshed`

    return (
        <View className="flex-row items-center gap-3 border-t border-line-2 py-3">
            <SourceTile
                label={visual.glyph}
                variant={visual.tile}
                icon={<IntegrationIcon name={integration.name} />}
            />
            <View className="flex-1">
                <View className="flex-row items-center gap-2">
                    <Text className="text-[14px] font-semibold text-ink">
                        {visual.sourceLabel}
                    </Text>
                    <View
                        className={`h-1.5 w-1.5 rounded-full ${
                            integration.enabled ? "bg-lime" : "bg-line"
                        }`}
                    />
                </View>
                <Text numberOfLines={1} className="text-xs text-ink-3">
                    {sub}
                </Text>
            </View>
            {integration.enabled && (
                <IconButton
                    glyph="↻"
                    label={`Refresh ${visual.sourceLabel}`}
                    busy={busy}
                    onPress={onRefresh}
                />
            )}
            <Button
                label={integration.enabled ? "Manage" : "Connect"}
                variant={integration.enabled ? "line" : "primary"}
                size="sm"
                onPress={() => openIntegration(integration.name)}
            />
        </View>
    )
}

function AppleHealthCard() {
    const health = useAppleHealth()

    const status = !health.supported
        ? "Needs the Accountable iOS app — not available in Expo Go or on this device."
        : !health.connected
          ? "Import your workouts and sleep automatically."
          : health.syncing
            ? "Syncing workouts and sleep…"
            : health.lastSync
              ? `Connected · synced ${formatRefreshed(health.lastSync)}`
              : "Connected"

    return (
        <Card className="p-5">
            <View className="flex-row items-center gap-3">
                <SourceTile
                    label="♥"
                    variant="coral"
                    icon={<IntegrationIcon name={APPLE_FITNESS} />}
                />
                <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                        <Text className="text-[14px] font-semibold text-ink">
                            Apple Health
                        </Text>
                        <View
                            className={`h-1.5 w-1.5 rounded-full ${
                                health.connected ? "bg-lime" : "bg-line"
                            }`}
                        />
                    </View>
                    <Text className="text-xs text-ink-3">{status}</Text>
                </View>
                {health.syncing && <Spinner />}
            </View>

            {health.error !== null && (
                <Text className="mt-3 text-xs text-coral-ink">
                    {health.error}
                </Text>
            )}

            <View className="mt-4 flex-row flex-wrap gap-2">
                {health.supported && !health.connected && (
                    <Button
                        label="Connect Apple Health"
                        size="sm"
                        onPress={() => void health.connect()}
                    />
                )}
                {health.connected && (
                    <>
                        <Button
                            label="Sync now"
                            size="sm"
                            busy={health.syncing}
                            onPress={() => void health.syncNow()}
                        />
                        <Button
                            label="Disconnect"
                            variant="line"
                            size="sm"
                            onPress={() => void health.disconnect()}
                        />
                    </>
                )}
                <Button
                    label="Workouts"
                    variant="line"
                    size="sm"
                    onPress={() => openIntegration(APPLE_FITNESS)}
                />
                <Button
                    label="Sleep"
                    variant="line"
                    size="sm"
                    onPress={() => openIntegration(APPLE_SLEEP)}
                />
            </View>

            {health.connected && (
                <Text className="mt-3 text-[11px] text-ink-3">
                    Disconnecting stops syncing. To revoke access entirely, use
                    Settings › Health › Data Access on your iPhone.
                </Text>
            )}
        </Card>
    )
}

export function IntegrationsPanel() {
    const api = useApi()
    const { data, loading, reload } = useAppData()
    const [refreshing, setRefreshing] = useState<string | null>(null)
    const [refreshingAll, setRefreshingAll] = useState(false)

    const sources = data.integrations.filter(
        (it) => !HEALTH_SOURCES.includes(it.name)
    )
    const connected = sources.filter((it) => it.enabled).length

    async function refresh(name: string) {
        setRefreshing(name)
        try {
            await getIntegration(api, name)
            reload()
        } catch {
            // best-effort; the integration screen surfaces detailed errors
        } finally {
            setRefreshing(null)
        }
    }

    async function refreshAll() {
        setRefreshingAll(true)
        try {
            await refreshAllIntegrations(api)
            reload()
        } catch {
            // best-effort; per-integration rows surface their own state
        } finally {
            setRefreshingAll(false)
        }
    }

    return (
        <>
            <Card className="p-5">
                <View className="mb-1 flex-row items-center justify-between gap-2">
                    <View className="flex-row items-center gap-2">
                        <Eyebrow>Accounts</Eyebrow>
                        {loading && <Spinner />}
                    </View>
                    {connected > 0 && (
                        <Button
                            label={
                                refreshingAll ? "Refreshing…" : "↻ Refresh all"
                            }
                            variant="line"
                            size="sm"
                            onPress={refreshAll}
                            busy={refreshingAll}
                        />
                    )}
                </View>
                <Text className="mb-3.5 text-[13px] text-ink-3">
                    Link by username; activity is pulled in daily.
                </Text>
                {sources.length === 0 ? (
                    <Text className="text-[13px] text-ink-3">
                        {loading ? "Loading…" : "No integrations available."}
                    </Text>
                ) : (
                    sources.map((it) => (
                        <IntegrationRow
                            key={it.name}
                            integration={it}
                            busy={refreshing === it.name}
                            onRefresh={() => refresh(it.name)}
                        />
                    ))
                )}
            </Card>

            <AppleHealthCard />
        </>
    )
}
