// Integration detail page — full-page settings + data view for a single integration.
// Replaces the old "Manage integrations" dialog: connect/disconnect lives here, alongside
// a recent-history view of the raw data the integration records (independent of any goals).
// For Apple Fitness this is also the home of workout logging (moved off the dashboard).

import { useCallback, useEffect, useState } from "react"
import { Navigate, Link, useParams } from "react-router-dom"
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
import { useAppData } from "../common/AppShell"
import { IntegrationIcon, SourceTile, Spinner } from "../common/primitives"
import {
    formatRefreshed,
    INTEGRATION_VISUAL,
    integrationVisual
} from "../dashboard/types"
import { AddWorkoutDialog } from "./components/AddWorkoutDialog"
import { WorkoutCard } from "./components/WorkoutCard"

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

/** Connect / disconnect controls. Apple Fitness is auto-managed and shown as read-only. */
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
        <div className="card p-6">
            <div className="eyebrow mb-3.5">CONFIGURATION</div>

            {name === APPLE_FITNESS ? (
                <p className="m-0 text-[13px] text-ink-3">
                    Apple Fitness is managed automatically — it records the
                    workouts you log below (and from the iOS companion app
                    later). There's nothing to connect.
                </p>
            ) : status?.enabled ? (
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[13px] text-ink-3">
                            Connected as
                        </div>
                        <div className="truncate text-[15px] font-semibold">
                            {status.externalID ?? "—"}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={disconnect}
                        disabled={busy}
                        className="btn btn-line btn-sm"
                    >
                        {busy ? "…" : "Disconnect"}
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && connect()}
                        placeholder={`${visual.sourceLabel} username`}
                        className="flex-1 rounded-[10px] border border-line bg-bg-card px-3 py-2 text-sm font-[inherit] text-ink outline-0"
                    />
                    <button
                        type="button"
                        onClick={connect}
                        disabled={busy}
                        className="btn btn-primary btn-sm"
                    >
                        {busy ? "…" : "Connect"}
                    </button>
                </div>
            )}

            {error && (
                <div className="mt-4 rounded-[10px] bg-coral-soft p-3 text-xs text-coral-ink">
                    {error}
                </div>
            )}
        </div>
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

/** Right-aligned summary text for one history day. */
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
        <div className="card p-6">
            <div className="eyebrow mb-3.5 flex items-center gap-2">
                <span>RECENT ACTIVITY</span>
                {loading && <Spinner />}
            </div>
            {history.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-line p-4 text-center text-[13px] text-ink-3">
                    {loading ? "Loading…" : "No data recorded yet."}
                </div>
            ) : (
                <ul className="flex list-none flex-col gap-1.5 p-0">
                    {history.map((day) => {
                        const frac = dayValue(day) / max
                        return (
                            <li
                                key={day.date}
                                className="flex items-center gap-3 py-1"
                            >
                                <div className="w-[92px] shrink-0 text-[12px] text-ink-3">
                                    {DAY_FMT.format(new Date(day.date))}
                                </div>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                                    <div
                                        className="h-full rounded-full bg-ink"
                                        style={{
                                            width: `${Math.max(
                                                frac * 100,
                                                dayValue(day) > 0 ? 6 : 0
                                            )}%`
                                        }}
                                    />
                                </div>
                                <div className="shrink-0 text-right text-[12px] font-medium text-ink-3">
                                    {dayLabel(day)}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

export default function IntegrationPage() {
    const { name = "" } = useParams()
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

    if (!known) return <Navigate to="/dashboard" replace />

    const status = data.integrations.find((it) => it.name === name)
    const visual = integrationVisual(name)

    async function refreshNow() {
        setRefreshing(true)
        try {
            await getIntegration(api, name)
            reload()
            await loadHistory()
        } catch {
            // surfaced elsewhere; keep the page usable
        } finally {
            setRefreshing(false)
        }
    }

    function afterConfigChange() {
        reload()
        loadHistory()
    }

    return (
        <main className="flex-1 px-9 py-7">
            <div className="mb-7 flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <SourceTile
                        label={visual.glyph}
                        variant={visual.tile}
                        icon={<IntegrationIcon name={name} />}
                    />
                    <div>
                        <div className="eyebrow mb-1">INTEGRATION</div>
                        <h1 className="display m-0 text-[36px]">
                            {visual.sourceLabel}
                        </h1>
                        <div className="mt-1 text-[13px] text-ink-3">
                            {status?.enabled
                                ? status.lastFetched
                                    ? `Last refreshed ${formatRefreshed(status.lastFetched)}`
                                    : "Connected · never refreshed"
                                : "Not connected"}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2.5">
                    <Link to="/dashboard" className="btn btn-line btn-sm">
                        ← Dashboard
                    </Link>
                    {status?.enabled && (
                        <button
                            type="button"
                            onClick={refreshNow}
                            disabled={refreshing}
                            className="btn btn-primary btn-sm"
                        >
                            {refreshing ? "Refreshing…" : "↻ Refresh"}
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
                <ConfigCard
                    name={name}
                    status={status}
                    onChanged={afterConfigChange}
                />
                <HistoryCard history={history} loading={historyLoading} />
            </div>

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
                <AddWorkoutDialog
                    onClose={() => setAddWorkoutOpen(false)}
                    onCreated={() => {
                        reload()
                        loadHistory()
                    }}
                />
            )}
        </main>
    )
}
