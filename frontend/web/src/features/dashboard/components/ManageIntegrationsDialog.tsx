// Manage integrations dialog — connect or disconnect the upstream accounts
// that feed goal progress (GitHub, LeetCode, …) via the integrations API.

import { useEffect, useState } from "react"
import {
    ApiError,
    disableIntegration,
    enableIntegration,
    getIntegration,
    type IntegrationStatus,
    listIntegrations,
    useApi
} from "@shared/index"
import { IntegrationIcon, SourceTile } from "../../common/primitives"
import { integrationVisual } from "../types"

function messageFor(err: unknown): string {
    if (err instanceof ApiError) return err.messages.join(", ")
    if (err instanceof Error) return err.message
    return "Something went wrong"
}

export function ManageIntegrationsDialog({
    onClose,
    onChanged
}: {
    onClose: () => void
    onChanged?: () => void
}) {
    const api = useApi()
    const [items, setItems] = useState<IntegrationStatus[] | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [busy, setBusy] = useState<{ name: string; action: string } | null>(
        null
    )
    const [refreshedAt, setRefreshedAt] = useState<Record<string, number>>({})
    const [actionError, setActionError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const list = await listIntegrations(api)
                if (!cancelled) setItems(list)
            } catch (err) {
                if (!cancelled) setLoadError(messageFor(err))
            }
        })()
        return () => {
            cancelled = true
        }
    }, [api])

    async function reloadList() {
        const list = await listIntegrations(api)
        setItems(list)
    }

    async function connect(name: string) {
        const externalID = (drafts[name] ?? "").trim()
        if (!externalID) {
            setActionError("Enter a username to connect.")
            return
        }
        setActionError(null)
        setBusy({ name, action: "connect" })
        try {
            await enableIntegration(api, name, externalID)
            await reloadList()
            onChanged?.()
        } catch (err) {
            setActionError(messageFor(err))
        } finally {
            setBusy(null)
        }
    }

    async function disconnect(name: string) {
        setActionError(null)
        setBusy({ name, action: "disconnect" })
        try {
            await disableIntegration(api, name)
            await reloadList()
            onChanged?.()
        } catch (err) {
            setActionError(messageFor(err))
        } finally {
            setBusy(null)
        }
    }

    async function refresh(name: string) {
        setActionError(null)
        setBusy({ name, action: "refresh" })
        try {
            const res = await getIntegration(api, name)
            setRefreshedAt((m) => ({
                ...m,
                [name]: res.lastFetched ?? Date.now()
            }))
            onChanged?.()
        } catch (err) {
            setActionError(messageFor(err))
        } finally {
            setBusy(null)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
            onClick={onClose}
        >
            <div
                className="card w-[460px] p-7"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-1 flex items-center justify-between">
                    <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">
                        Manage integrations
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-7 w-7 place-items-center rounded-full text-[18px] text-ink-3 hover:bg-bg-sunken"
                    >
                        ×
                    </button>
                </div>
                <p className="mb-5 mt-0 text-[13px] text-ink-3">
                    Connect the accounts your goals track progress from.
                </p>

                {loadError ? (
                    <div className="rounded-[10px] bg-coral-soft p-3 text-xs text-coral-ink">
                        {loadError}
                    </div>
                ) : items === null ? (
                    <div className="py-6 text-center text-[13px] text-ink-3">
                        Loading…
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {items.map((it) => {
                            const visual = integrationVisual(it.name)
                            const rowBusy = busy?.name === it.name
                            const fetched = refreshedAt[it.name]
                            return (
                                <div
                                    key={it.name}
                                    className="rounded-[12px] border border-line p-3.5"
                                >
                                    <div className="flex items-center gap-3">
                                        <SourceTile
                                            label={visual.glyph}
                                            variant={visual.tile}
                                            icon={<IntegrationIcon name={it.name} />}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[14px] font-semibold">
                                                {visual.sourceLabel}
                                            </div>
                                            <div className="text-[11px] text-ink-3">
                                                {it.enabled
                                                    ? `connected · ${it.externalID ?? "—"}${
                                                          fetched
                                                              ? ` · updated ${new Date(fetched).toLocaleTimeString()}`
                                                              : ""
                                                      }`
                                                    : "not connected"}
                                            </div>
                                        </div>
                                        {it.enabled && (
                                            <span className="chip bg-lime-soft text-lime-ink">
                                                active
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        {it.enabled ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        refresh(it.name)
                                                    }
                                                    disabled={rowBusy}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    {busy?.name === it.name &&
                                                    busy.action === "refresh"
                                                        ? "Refreshing…"
                                                        : "Refresh"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        disconnect(it.name)
                                                    }
                                                    disabled={rowBusy}
                                                    className="btn btn-line btn-sm"
                                                >
                                                    {busy?.name === it.name &&
                                                    busy.action === "disconnect"
                                                        ? "…"
                                                        : "Disconnect"}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <input
                                                    value={drafts[it.name] ?? ""}
                                                    onChange={(e) =>
                                                        setDrafts((d) => ({
                                                            ...d,
                                                            [it.name]:
                                                                e.target.value
                                                        }))
                                                    }
                                                    placeholder={`${visual.sourceLabel} username`}
                                                    className="flex-1 rounded-[10px] border border-line bg-bg-card px-3 py-2 text-sm font-[inherit] text-ink outline-0"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        connect(it.name)
                                                    }
                                                    disabled={rowBusy}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    {rowBusy
                                                        ? "…"
                                                        : "Connect"}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {actionError && (
                    <div className="mt-4 rounded-[10px] bg-coral-soft p-3 text-xs text-coral-ink">
                        {actionError}
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-line"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
