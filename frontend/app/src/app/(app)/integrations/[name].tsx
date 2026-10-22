// Integration detail — connect/disconnect plus a recent-history view of the raw
// data the integration records (independent of any goals). For Apple Fitness this
// is also the home of workout logging.

import { useCallback, useEffect, useState } from "react"
import { Text, View } from "react-native"
import { Redirect, useLocalSearchParams } from "expo-router"
import {
    ApiError,
    disableIntegration,
    enableIntegration,
    getIntegration,
    getIntegrationHistory,
    type IntegrationHistoryDay,
    type IntegrationStatus,
    useApi
} from "@shared/index"
import { useAppData } from "../../../features/common/AppData"
import {
    formatRefreshed,
    INTEGRATION_VISUAL,
    integrationVisual
} from "../../../features/dashboard/types"
import { AddWorkoutSheet } from "../../../features/integration/components/AddWorkoutSheet"
import { WorkoutCard } from "../../../features/integration/components/WorkoutCard"
import { colors } from "../../../theme"
import { BackBar } from "../../../ui/BackBar"
import { Screen } from "../../../ui/Screen"
import {
    Bar,
    Button,
    Card,
    Display,
    ErrorList,
    Eyebrow,
    Input,
    IntegrationIcon,
    SourceTile,
    Spinner
} from "../../../ui/primitives"

const APPLE_FITNESS = "apple_fitness"

const DAY_FMT = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
})

function messageFor(err: unknown): string {
    if (err instanceof ApiError) return err.messages.join(", ")
    if (err instanceof Error) return err.message
    return "Something went wrong"
}

/** Connect / disconnect controls. Apple Fitness is auto-managed and read-only. */
function ConfigCard({
    name,
    status,
    onChanged
}: {
    name: string
    status: IntegrationStatus | undefined
    onChanged: () => void
}) {
    const api = useApi()
    const visual = integrationVisual(name)
    const [draft, setDraft] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function connect() {
        const externalID = draft.trim()
        if (!externalID) {
            setError("Enter a username to connect.")
            return
        }
        setError(null)
        setBusy(true)
        try {
            await enableIntegration(api, name, externalID)
            setDraft("")
            onChanged()
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setBusy(false)
        }
    }

    async function disconnect() {
        setError(null)
        setBusy(true)
        try {
            await disableIntegration(api, name)
            onChanged()
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Card className="p-5">
            <Eyebrow className="mb-3.5">Configuration</Eyebrow>

            {name === APPLE_FITNESS ? (
                <Text className="text-[13px] text-ink-3">
                    Workouts you log below are recorded here, along with any
                    imported from Apple Health — connect it on the Integrations
                    tab to sync them automatically.
                </Text>
            ) : status?.enabled ? (
                <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                        <Text className="text-[13px] text-ink-3">
                            Connected as
                        </Text>
                        <Text
                            numberOfLines={1}
                            className="text-[15px] font-semibold text-ink"
                        >
                            {status.externalID ?? "—"}
                        </Text>
                    </View>
                    <Button
                        label="Disconnect"
                        variant="line"
                        size="sm"
                        onPress={disconnect}
                        busy={busy}
                    />
                </View>
            ) : (
                <View className="flex-row items-center gap-2">
                    <Input
                        value={draft}
                        onChangeText={setDraft}
                        onSubmitEditing={connect}
                        returnKeyType="go"
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder={`${visual.sourceLabel} username`}
                        className="flex-1"
                    />
                    <Button
                        label="Connect"
                        size="sm"
                        onPress={connect}
                        busy={busy}
                    />
                </View>
            )}

            {error !== null && (
                <View className="mt-4">
                    <ErrorList errors={[error]} />
                </View>
            )}
        </Card>
    )
}

/** Numeric value for one history day, used to scale the inline bars. */
function dayValue(day: IntegrationHistoryDay): number {
    switch (day.type) {
        case "github":
            return day.commits
        case "leetcode":
            return day.easy + day.medium + day.hard
        case "apple_fitness":
            return day.workouts
    }
}

/** Summary text for one history day. */
function dayLabel(day: IntegrationHistoryDay): string {
    switch (day.type) {
        case "github":
            return `${day.commits} commit${day.commits === 1 ? "" : "s"}`
        case "leetcode": {
            const total = day.easy + day.medium + day.hard
            return `${total} solved · ${day.easy}E ${day.medium}M ${day.hard}H`
        }
        case "apple_fitness":
            return `${day.workouts} workout${
                day.workouts === 1 ? "" : "s"
            } · ${day.calories.toLocaleString()} kcal`
    }
}

function HistoryCard({
    history,
    loading
}: {
    history: IntegrationHistoryDay[]
    loading: boolean
}) {
    const max = Math.max(1, ...history.map(dayValue))
    return (
        <Card className="p-5">
            <View className="mb-3.5 flex-row items-center gap-2">
                <Eyebrow>Recent activity</Eyebrow>
                {loading && <Spinner />}
            </View>
            {history.length === 0 ? (
                <View className="rounded-[10px] border border-line p-4">
                    <Text className="text-center text-[13px] text-ink-3">
                        {loading ? "Loading…" : "No data recorded yet."}
                    </Text>
                </View>
            ) : (
                <View className="gap-2.5">
                    {history.map((day) => {
                        const value = dayValue(day)
                        return (
                            <View key={day.date} className="gap-1.5">
                                <View className="flex-row justify-between">
                                    <Text className="text-xs text-ink-3">
                                        {DAY_FMT.format(new Date(day.date))}
                                    </Text>
                                    <Text className="text-xs font-medium text-ink-3">
                                        {dayLabel(day)}
                                    </Text>
                                </View>
                                <Bar
                                    pct={Math.max(
                                        (value / max) * 100,
                                        value > 0 ? 6 : 0
                                    )}
                                    color={colors.ink}
                                />
                            </View>
                        )
                    })}
                </View>
            )}
        </Card>
    )
}

export default function IntegrationScreen() {
    const { name = "" } = useLocalSearchParams<{ name: string }>()
    const api = useApi()
    const { data, loading: dashLoading, reload } = useAppData()

    const known = name in INTEGRATION_VISUAL
    const [history, setHistory] = useState<IntegrationHistoryDay[]>([])
    const [historyLoading, setHistoryLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [addWorkoutOpen, setAddWorkoutOpen] = useState(false)

    const loadHistory = useCallback(async () => {
        if (!known) return
        setHistoryLoading(true)
        try {
            setHistory(await getIntegrationHistory(api, name))
        } catch {
            setHistory([])
        } finally {
            setHistoryLoading(false)
        }
    }, [api, name, known])

    useEffect(() => {
        loadHistory()
    }, [loadHistory])

    if (!known) return <Redirect href="/dashboard" />

    const status = data.integrations.find((it) => it.name === name)
    const visual = integrationVisual(name)

    async function refreshNow() {
        setRefreshing(true)
        try {
            await getIntegration(api, name)
            reload()
            await loadHistory()
        } catch {
            // surfaced elsewhere; keep the screen usable
        } finally {
            setRefreshing(false)
        }
    }

    function afterConfigChange() {
        reload()
        loadHistory()
    }

    return (
        <Screen edges={["top", "bottom"]}>
            <BackBar />

            <View className="flex-row items-center gap-4">
                <SourceTile
                    label={visual.glyph}
                    variant={visual.tile}
                    icon={<IntegrationIcon name={name} />}
                />
                <View className="flex-1">
                    <Display size={28}>{visual.sourceLabel}</Display>
                    <Text className="mt-1 text-[13px] text-ink-3">
                        {status?.enabled
                            ? status.lastFetched
                                ? `Last refreshed ${formatRefreshed(status.lastFetched)}`
                                : "Connected · never refreshed"
                            : "Not connected"}
                    </Text>
                </View>
            </View>

            {status?.enabled && (
                <View className="flex-row">
                    <Button
                        label={refreshing ? "Refreshing…" : "↻ Refresh"}
                        size="sm"
                        onPress={refreshNow}
                        busy={refreshing}
                    />
                </View>
            )}

            <ConfigCard
                name={name}
                status={status}
                onChanged={afterConfigChange}
            />

            <HistoryCard history={history} loading={historyLoading} />

            {name === APPLE_FITNESS && (
                <WorkoutCard
                    workouts={data.workouts}
                    onAdd={() => setAddWorkoutOpen(true)}
                    onChanged={() => {
                        reload()
                        loadHistory()
                    }}
                    loading={dashLoading}
                />
            )}

            {addWorkoutOpen && (
                <AddWorkoutSheet
                    onClose={() => setAddWorkoutOpen(false)}
                    onCreated={() => {
                        reload()
                        loadHistory()
                    }}
                />
            )}
        </Screen>
    )
}
