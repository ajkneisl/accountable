// Integrations tab of Settings: connect and refresh the data sources goals are
// tracked against. GitHub and LeetCode link by username, workouts, sleep and
// steps come from Apple Health, and screen time from iOS Screen Time.

import { useState } from "react"
import { Text, View } from "react-native"
import { router } from "expo-router"
import {
    type IntegrationStatus,
    refreshAllIntegrations,
    useApi
} from "@shared/index"
import { useAppData } from "../common/AppData"
import { formatRefreshed, integrationVisual } from "../dashboard/types"
import { useAppleHealth } from "../health/AppleHealthData"
import { useScreenTime } from "../screenTime/ScreenTimeData"
import { useColors } from "../../theme"
import { BoxButton } from "../../ui/BoxButton"
import { RefreshIcon } from "../../ui/icons"
import {
    Button,
    Card,
    Eyebrow,
    IntegrationIcon,
    SourceTile,
    Spinner
} from "../../ui/primitives"

const APPLE_FITNESS = "apple_fitness"
const APPLE_SLEEP = "apple_sleep"
const APPLE_STEPS = "apple_steps"
const SCREEN_TIME = "screen_time"
/** Fed by the Apple Health and Screen Time cards rather than linked by username. */
const DEVICE_SOURCES = [APPLE_FITNESS, APPLE_SLEEP, APPLE_STEPS, SCREEN_TIME]

function openIntegration(name: string) {
    router.push({ pathname: "/integrations/[name]", params: { name } })
}

function IntegrationRow({ integration }: { integration: IntegrationStatus }) {
    const visual = integrationVisual(integration.name)
    const sub = !integration.enabled
        ? "Not connected"
        : integration.lastFetched
          ? `Last synced ${formatRefreshed(integration.lastFetched)}`
          : `Never synced`

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
                </View>
                <Text numberOfLines={1} className="text-xs text-ink-3">
                    {sub}
                </Text>
            </View>
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
        ? "Unavailable"
        : !health.connected
          ? "Import your workouts, sleep and steps automatically."
          : health.syncing
            ? "Syncing workouts, sleep and steps…"
            : health.lastSync
              ? `Synced ${formatRefreshed(health.lastSync)}`
              : "Never synced"

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

            <View className="mt-4 flex-row flex-wrap gap-2 justify-between">
                {health.supported && !health.connected && (
                    <Button
                        label="Connect Apple Health"
                        size="sm"
                        onPress={() => void health.connect()}
                    />
                )}

                {health.connected && (
                    <View className="flex-row flex-wrap gap-2">
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
                    </View>
                )}
                <Button
                    label="View data"
                    variant="line"
                    size="sm"
                    onPress={() => openIntegration(APPLE_FITNESS)}
                />
            </View>
        </Card>
    )
}

function ScreenTimeCard() {
    const screenTime = useScreenTime()

    const status = !screenTime.supported
        ? "Unavailable"
        : !screenTime.connected
          ? "Track your screen time against a daily or weekly limit."
          : screenTime.syncing
            ? "Syncing screen time…"
            : screenTime.lastSync
              ? `Last synced ${formatRefreshed(screenTime.lastSync)}`
              : "Never synced"

    const { todayMinutes, lastEventAt } = screenTime.status
    const recorded = !screenTime.connected
        ? null
        : lastEventAt === null
          ? "No usage recorded yet, it appears after your first minute in a tracked app."
          : `Today ${Math.floor((todayMinutes ?? 0) / 60)}h ${(todayMinutes ?? 0) % 60}m · updated ${formatRefreshed(lastEventAt)}`

    return (
        <Card className="p-5">
            <View className="flex-row items-center gap-3">
                <SourceTile
                    label="SC"
                    variant="coral"
                    icon={<IntegrationIcon name={SCREEN_TIME} />}
                />

                <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                        <Text className="text-[14px] font-semibold text-ink">
                            Screen Time
                        </Text>
                    </View>

                    <Text className="text-xs text-ink-3">{status}</Text>

                    {recorded !== null && (
                        <Text className="text-xs text-ink-3">{recorded}</Text>
                    )}
                </View>

                {screenTime.syncing && <Spinner />}
            </View>

            {screenTime.error !== null && (
                <Text className="mt-3 text-xs text-coral-ink">
                    {screenTime.error}
                </Text>
            )}

            <View className="mt-4 flex-row flex-wrap gap-2 justify-between">
                {screenTime.supported && !screenTime.connected && (
                    <Button
                        label="Connect Screen Time"
                        size="sm"
                        onPress={() => void screenTime.connect()}
                    />
                )}
                {screenTime.connected && (
                    <View className="flex-row flex-wrap gap-2">
                        <Button
                            label="Sync now"
                            size="sm"
                            busy={screenTime.syncing}
                            onPress={() => void screenTime.syncNow()}
                        />
                        <Button
                            label="Choose apps"
                            variant="line"
                            size="sm"
                            onPress={() => void screenTime.chooseApps()}
                        />
                        <Button
                            label="Disconnect"
                            variant="line"
                            size="sm"
                            onPress={screenTime.disconnect}
                        />
                    </View>
                )}
                <Button
                    label="View data"
                    variant="line"
                    size="sm"
                    onPress={() => openIntegration(SCREEN_TIME)}
                />
            </View>
        </Card>
    )
}

export function IntegrationsPanel() {
    const colors = useColors()
    const api = useApi()
    const { data, loading, reload } = useAppData()
    const [refreshingAll, setRefreshingAll] = useState(false)

    const sources = data.integrations.filter(
        (it) => !DEVICE_SOURCES.includes(it.name)
    )
    const connected = sources.filter((it) => it.enabled).length

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
                <View className="mb-3 flex-row items-center justify-between gap-2">
                    <View className="flex-row items-center gap-2">
                        <Eyebrow>Accounts</Eyebrow>
                        {/* A refresh shows its own spinner in the button. */}
                        {loading && !refreshingAll && <Spinner />}
                    </View>

                    {/* Overhangs the header row rather than heightening it, so
                        the eyebrow sits where it does on every card. */}
                    {connected > 0 && (
                        <BoxButton
                            label="Refresh all accounts"
                            onPress={refreshAll}
                            busy={refreshingAll}
                            className="-my-1.5"
                        >
                            <RefreshIcon color={colors.ink2} size={17} />
                        </BoxButton>
                    )}
                </View>

                {sources.length === 0 ? (
                    <Text className="text-[13px] text-ink-3">
                        {loading ? "Loading…" : "No integrations available."}
                    </Text>
                ) : (
                    sources.map((it) => (
                        <IntegrationRow key={it.name} integration={it} />
                    ))
                )}
            </Card>

            <AppleHealthCard />

            <ScreenTimeCard />
        </>
    )
}
