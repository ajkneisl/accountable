// Settings page — account-level settings, connected data sources, and sign-out.
// Per-integration configuration still lives on each integration's own page.

import { useState } from "react"
import { useAtomValue } from "jotai"
import { Link } from "react-router-dom"
import {
    getIntegration,
    type IntegrationStatus,
    refreshAllIntegrations,
    useApi
} from "@shared/index"
import { useSignOut, userAtom } from "../../auth"
import { useAppData } from "../common/AppShell"
import { IntegrationIcon, SourceTile, Spinner } from "../common/primitives"
import { formatRefreshed, integrationVisual } from "../dashboard/types"
import { AccountShell, InfoRow } from "./AccountShell"

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
          ? `Refreshed ${formatRefreshed(integration.lastFetched)}`
          : "Never refreshed"

    return (
        <div className="flex items-center gap-3 border-t border-line-2 py-3 first:border-t-0">
            <SourceTile
                label={visual.glyph}
                variant={visual.tile}
                icon={<IntegrationIcon name={integration.name} />}
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">
                        {visual.sourceLabel}
                    </span>
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${
                            integration.enabled ? "bg-lime" : "bg-line"
                        }`}
                    />
                </div>
                <div className="truncate text-[12px] text-ink-3">{sub}</div>
            </div>
            {integration.enabled && (
                <button
                    type="button"
                    title="Refresh now"
                    aria-label={`Refresh ${visual.sourceLabel}`}
                    disabled={busy}
                    onClick={onRefresh}
                    className="grid h-8 w-8 place-items-center rounded-[9px] border border-line bg-bg-card text-[14px] text-ink-3 hover:bg-bg-sunken disabled:opacity-50"
                >
                    {busy ? <Spinner size={13} /> : "↻"}
                </button>
            )}
            <Link
                to={`/integrations/${integration.name}`}
                className="btn btn-line btn-sm no-underline"
            >
                {integration.enabled ? "Manage" : "Connect"}
            </Link>
        </div>
    )
}

export default function SettingsPage() {
    const api = useApi()
    const signOut = useSignOut()
    const user = useAtomValue(userAtom)
    const { data, loading, reload } = useAppData()

    const [refreshing, setRefreshing] = useState<string | null>(null)
    const [refreshingAll, setRefreshingAll] = useState(false)

    async function refresh(name: string) {
        setRefreshing(name)
        try {
            await getIntegration(api, name)
            reload()
        } catch {
            // best-effort; the integration page surfaces detailed errors
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

    const integrations = data.integrations
    const hasConnected = integrations.some((it) => it.enabled)

    return (
        <AccountShell eyebrow="ACCOUNT" title="Settings">
            <div className="flex max-w-[560px] flex-col gap-4">
                <div className="card p-6">
                    <div className="eyebrow mb-3.5">ACCOUNT</div>
                    <InfoRow label="Username" value={user?.username ?? "—"} />
                    <InfoRow label="Email" value={user?.email ?? "—"} />
                    <div className="mt-4">
                        <Link
                            to="/profile"
                            className="btn btn-line btn-sm no-underline"
                        >
                            View profile
                        </Link>
                    </div>
                </div>

                <div className="card p-6">
                    <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="eyebrow">INTEGRATIONS</div>
                            {loading && <Spinner />}
                        </div>
                        {hasConnected && (
                            <button
                                type="button"
                                onClick={refreshAll}
                                disabled={refreshingAll}
                                className="btn btn-line btn-sm"
                            >
                                {refreshingAll ? (
                                    <>
                                        <Spinner size={13} /> Refreshing…
                                    </>
                                ) : (
                                    "↻ Refresh all"
                                )}
                            </button>
                        )}
                    </div>
                    <p className="m-0 mb-3.5 text-[13px] text-ink-3">
                        Connect the data sources Accountable tracks your goals
                        against.
                    </p>
                    {integrations.length === 0 ? (
                        <div className="text-[13px] text-ink-3">
                            {loading ? "Loading…" : "No integrations available."}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {integrations.map((it) => (
                                <IntegrationRow
                                    key={it.name}
                                    integration={it}
                                    busy={refreshing === it.name}
                                    onRefresh={() => refresh(it.name)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="card p-6">
                    <div className="eyebrow mb-2">SESSION</div>
                    <p className="m-0 mb-3.5 text-[13px] text-ink-3">
                        Sign out of Accountable on this device.
                    </p>
                    <button
                        type="button"
                        onClick={signOut}
                        className="btn btn-line btn-sm"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </AccountShell>
    )
}
