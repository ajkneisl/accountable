// Compact integrations status for the dashboard: when each connected source last
// refreshed, plus a one-click "Refresh all". Full management lives in Settings.

import { useState } from "react"
import { refreshAllIntegrations, useApi } from "@shared/index"
import { useAppData } from "../../common/AppShell"
import { IntegrationIcon, SourceTile, Spinner } from "../../common/primitives"
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
        <div className="card mb-4 flex items-center justify-between gap-4 px-5 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
                <span className="eyebrow shrink-0">SYNCED</span>
                {connected.map((it) => {
                    const visual = integrationVisual(it.name)
                    return (
                        <div
                            key={it.name}
                            className="flex items-center gap-2"
                            title={visual.sourceLabel}
                        >
                            <SourceTile
                                size="sm"
                                label={visual.glyph}
                                variant={visual.tile}
                                icon={<IntegrationIcon name={it.name} />}
                            />
                            <div className="leading-tight">
                                <div className="text-[12px] font-semibold">
                                    {visual.sourceLabel}
                                </div>
                                <div className="text-[11px] text-ink-3">
                                    {it.lastFetched
                                        ? formatRefreshed(it.lastFetched)
                                        : "never refreshed"}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            <button
                type="button"
                onClick={refreshAll}
                disabled={busy}
                className="btn btn-line btn-sm shrink-0"
            >
                {busy ? (
                    <>
                        <Spinner size={13} /> Refreshing…
                    </>
                ) : (
                    "↻ Refresh all"
                )}
            </button>
        </div>
    )
}
