// Integrations tab of Settings: connect and refresh the data sources goals are
// tracked against. Every source is one row — what it is, where it stands, and
// a single button — in two groups: accounts linked by username (GitHub,
// LeetCode, Chess.com), and what's read from this iPhone (Apple Health for
// workouts, sleep, steps and distance, and iOS Screen Time). Each group's heading refreshes all of it.
//
// An account's Manage opens its page, where it's connected and disconnected. A
// phone source has no such page to do that on, so its Manage is a menu: sync,
// view its data, disconnect.

import { type ReactNode, useState } from "react"
import { Platform, Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import {
    type IntegrationStatus,
    refreshAllIntegrations,
    useApi
} from "@shared/index"
import { useAppData } from "../common/AppData"
import { formatRefreshed, integrationVisual } from "../dashboard/types"
import { useAppleHealth } from "../health/AppleHealthData"
import { HEALTH_SOURCE, THIS_PHONE } from "../health/healthName"
import { useScreenTime } from "../screenTime/ScreenTimeData"
import { showMenu } from "../../ui/menu"
import { Button, Card, IntegrationIcon, SourceTile } from "../../ui/primitives"

const APPLE_FITNESS = "apple_fitness"
const APPLE_SLEEP = "apple_sleep"
const APPLE_STEPS = "apple_steps"
const APPLE_DISTANCE = "apple_distance"
const SCREEN_TIME = "screen_time"
/** Fed by the Apple Health and Screen Time rows rather than linked by username. */
const DEVICE_SOURCES = [
    APPLE_FITNESS,
    APPLE_SLEEP,
    APPLE_STEPS,
    APPLE_DISTANCE,
    SCREEN_TIME
]

function openIntegration(name: string) {
    router.push({ pathname: "/integrations/[name]", params: { name } })
}

/**
 * A titled group of sources, with an optional action beside the title. The
 * heading is inset as far as the rows inside the card, so the title starts
 * where the tiles do and the action ends where the buttons do.
 */
function Group({
    title,
    action,
    children
}: {
    title: string
    action?: ReactNode
    children: ReactNode
}) {
    return (
        <View className="gap-2">
            <View className="flex-row items-center justify-between gap-2 px-4">
                <Text className="text-[13px] font-semibold leading-[18px] text-ink-3">
                    {title}
                </Text>
                {action}
            </View>
            <Card className="px-4">{children}</Card>
        </View>
    )
}

/**
 * The action beside a group's title: a word set exactly like the title, so the
 * two sit on one line with nothing to fall out of step. It says what it's
 * doing while it works rather than swapping in a spinner.
 */
function RefreshButton({
    label,
    busyLabel,
    hint,
    busy,
    onPress
}: {
    /** The word shown: "Refresh", "Sync". */
    label: string
    /** The word shown while it's working: "Refreshing…". */
    busyLabel: string
    /** What it refreshes, for VoiceOver. */
    hint: string
    busy: boolean
    onPress: () => void
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={hint}
            accessibilityState={{ busy, disabled: busy }}
            hitSlop={10}
            className="active:opacity-60"
        >
            <Text
                className={`text-[13px] font-semibold leading-[18px] ${
                    busy ? "text-ink-3" : "text-ink"
                }`}
            >
                {busy ? busyLabel : label}
            </Text>
        </Pressable>
    )
}

/** One source: its tile, name and standing, and a single button. */
function SourceRow({
    first,
    tile,
    name,
    status,
    error,
    action
}: {
    first: boolean
    tile: ReactNode
    name: string
    status: string
    error?: string | null
    action?: ReactNode
}) {
    return (
        <View className={`py-3.5 ${first ? "" : "border-t border-line-2"}`}>
            <View className="flex-row items-center gap-3">
                {tile}
                <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-ink">
                        {name}
                    </Text>
                    <Text className="text-[13px] leading-[18px] text-ink-3">
                        {status}
                    </Text>
                </View>
                {action}
            </View>
            {error != null && (
                <Text className="mt-2 text-[13px] leading-[18px] text-coral-ink">
                    {error}
                </Text>
            )}
        </View>
    )
}

/** Connect for a source that isn't yet, Manage for one that is. */
function SourceButton({
    connected,
    onConnect,
    onManage
}: {
    connected: boolean
    onConnect: () => void
    onManage: () => void
}) {
    return (
        <Button
            label={connected ? "Manage" : "Connect"}
            variant={connected ? "line" : "primary"}
            size="sm"
            onPress={connected ? onManage : onConnect}
        />
    )
}

function AccountRow({
    integration,
    first
}: {
    integration: IntegrationStatus
    first: boolean
}) {
    const visual = integrationVisual(integration.name)
    const open = () => openIntegration(integration.name)
    return (
        <SourceRow
            first={first}
            tile={
                <SourceTile
                    label={visual.glyph}
                    variant={visual.tile}
                    icon={<IntegrationIcon name={integration.name} />}
                />
            }
            name={visual.sourceLabel}
            status={
                !integration.enabled
                    ? "Not connected"
                    : integration.lastFetched
                      ? `Synced ${formatRefreshed(integration.lastFetched)}`
                      : "Never synced"
            }
            // Both lead to its page: that's where a username is entered.
            action={
                <SourceButton
                    connected={integration.enabled}
                    onConnect={open}
                    onManage={open}
                />
            }
        />
    )
}

function AppleHealthRow({ first }: { first: boolean }) {
    const health = useAppleHealth()
    return (
        <SourceRow
            first={first}
            tile={
                <SourceTile
                    label="♥"
                    variant="coral"
                    icon={<IntegrationIcon name={APPLE_FITNESS} />}
                />
            }
            name={HEALTH_SOURCE}
            status={
                !health.supported
                    ? "Unavailable on this device"
                    : !health.connected
                      ? "Import workouts, sleep, steps and distance automatically."
                      : health.syncing
                        ? "Syncing…"
                        : health.lastSync
                          ? `Synced ${formatRefreshed(health.lastSync)}`
                          : "Never synced"
            }
            error={health.error}
            action={
                health.supported && (
                    <SourceButton
                        connected={health.connected}
                        onConnect={() => void health.connect()}
                        onManage={() =>
                            showMenu(HEALTH_SOURCE, [
                                {
                                    label: "Sync now",
                                    run: () => void health.syncNow()
                                },
                                {
                                    label: "View data",
                                    run: () => openIntegration(APPLE_FITNESS)
                                },
                                {
                                    label: "Disconnect",
                                    destructive: true,
                                    run: () => void health.disconnect()
                                }
                            ])
                        }
                    />
                )
            }
        />
    )
}

function ScreenTimeRow({ first }: { first: boolean }) {
    const screenTime = useScreenTime()
    const { todayMinutes, lastEventAt } = screenTime.status
    const today = todayMinutes ?? 0
    return (
        <SourceRow
            first={first}
            tile={
                <SourceTile
                    label="SC"
                    variant="coral"
                    icon={<IntegrationIcon name={SCREEN_TIME} />}
                />
            }
            name="Screen Time"
            status={
                !screenTime.supported
                    ? "Unavailable on this device"
                    : !screenTime.connected
                      ? "Track screen time against a daily or weekly limit."
                      : screenTime.syncing
                        ? "Syncing screen time…"
                        : lastEventAt === null
                          ? "No usage recorded yet. It appears after your first minute in a tracked app."
                          : `Today ${Math.floor(today / 60)}h ${today % 60}m · updated ${formatRefreshed(lastEventAt)}`
            }
            error={screenTime.error}
            action={
                screenTime.supported && (
                    <SourceButton
                        connected={screenTime.connected}
                        onConnect={() => void screenTime.connect()}
                        onManage={() =>
                            showMenu("Screen Time", [
                                {
                                    label: "Sync now",
                                    run: () => void screenTime.syncNow()
                                },
                                // Android counts every app, so there's nothing to choose.
                                ...(Platform.OS === "ios"
                                    ? [
                                          {
                                              label: "Choose apps",
                                              run: () =>
                                                  void screenTime.chooseApps()
                                          }
                                      ]
                                    : []),
                                {
                                    label: "View data",
                                    run: () => openIntegration(SCREEN_TIME)
                                },
                                {
                                    label: "Disconnect",
                                    destructive: true,
                                    run: screenTime.disconnect
                                }
                            ])
                        }
                    />
                )
            }
        />
    )
}

export function IntegrationsPanel() {
    const api = useApi()
    const { data, loading, reload } = useAppData()
    const health = useAppleHealth()
    const screenTime = useScreenTime()
    const [refreshingAll, setRefreshingAll] = useState(false)

    const accounts = data.integrations.filter(
        (it) => !DEVICE_SOURCES.includes(it.name)
    )

    async function refreshAccounts() {
        setRefreshingAll(true)
        try {
            await refreshAllIntegrations(api)
            reload()
        } catch {
            // best-effort; each row shows where it stands
        } finally {
            setRefreshingAll(false)
        }
    }

    function syncPhone() {
        if (health.connected) void health.syncNow()
        if (screenTime.connected) void screenTime.syncNow()
    }

    return (
        <>
            <Group
                title="Accounts"
                action={
                    accounts.some((it) => it.enabled) && (
                        <RefreshButton
                            label="Refresh"
                            busyLabel="Refreshing…"
                            hint="Refresh all accounts"
                            busy={refreshingAll}
                            onPress={() => void refreshAccounts()}
                        />
                    )
                }
            >
                {accounts.length === 0 ? (
                    <Text className="py-3.5 text-[13px] text-ink-3">
                        {loading ? "Loading…" : "No integrations available."}
                    </Text>
                ) : (
                    accounts.map((it, i) => (
                        <AccountRow
                            key={it.name}
                            integration={it}
                            first={i === 0}
                        />
                    ))
                )}
            </Group>

            <Group
                title={THIS_PHONE}
                action={
                    (health.connected || screenTime.connected) && (
                        <RefreshButton
                            label="Sync"
                            busyLabel="Syncing…"
                            hint={`Sync ${HEALTH_SOURCE}${screenTime.supported ? " and Screen Time" : ""}`}
                            busy={health.syncing || screenTime.syncing}
                            onPress={syncPhone}
                        />
                    )
                }
            >
                <AppleHealthRow first />
                <ScreenTimeRow first={false} />
            </Group>
        </>
    )
}
