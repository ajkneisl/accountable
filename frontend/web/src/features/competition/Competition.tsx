// Competition — real-data view of the authenticated user's competitions.

import { useEffect, useState } from "react"
import { useAtomValue } from "jotai"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
    ApiError,
    type CompetitionDetail,
    deleteCompetition,
    getCompetition,
    leaveCompetition,
    useApi
} from "@shared/index"
import { userAtom } from "../../auth"
import { useAppData } from "../common/AppShell"
import { buildColorMap } from "./colors"
import { CompetitionBoard } from "./components/CompetitionBoard"

function Header({
    competition,
    isOwner,
    onAction,
    busy
}: {
    competition: CompetitionDetail
    isOwner: boolean
    onAction: () => void
    busy: boolean
}) {
    return (
        <div className="mb-6 flex items-start justify-between gap-4">
            <div>
                <div className="eyebrow mb-2">COMPETITION</div>
                <h1 className="display m-0 text-[40px]">{competition.name}</h1>
                <div className="mt-2 text-[13px] text-ink-3">
                    {competition.members.length} member
                    {competition.members.length === 1 ? "" : "s"} ·{" "}
                    {competition.goals.length} shared goal
                    {competition.goals.length === 1 ? "" : "s"}
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="card flex items-center gap-3 px-4 py-2">
                    <div className="text-[11px] uppercase text-ink-3">
                        Join code
                    </div>
                    <div className="mono text-[20px] font-bold tracking-[0.05em]">
                        {competition.joinCode}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onAction}
                    disabled={busy}
                    className="btn btn-line btn-sm"
                >
                    {busy ? "…" : isOwner ? "Delete competition" : "Leave"}
                </button>
            </div>
        </div>
    )
}

export default function Competition() {
    const api = useApi()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const user = useAtomValue(userAtom)
    const { data: dashData, reload } = useAppData()

    const requestedID = searchParams.get("c")
    const [activeID, setActiveID] = useState<string | null>(requestedID)
    const [detail, setDetail] = useState<CompetitionDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailTick, setDetailTick] = useState(0)
    const [actionBusy, setActionBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const competitions = dashData.competitions

    // Honor ?c=<id> (e.g. after creating/joining from the sidebar), even if already mounted.
    useEffect(() => {
        if (requestedID) setActiveID(requestedID)
    }, [requestedID])

    useEffect(() => {
        if (activeID === null && competitions.length > 0) {
            setActiveID(competitions[0].id)
        }
    }, [activeID, competitions])

    useEffect(() => {
        if (!activeID) {
            setDetail(null)
            return
        }
        let cancelled = false
        setDetailLoading(true)
        getCompetition(api, activeID)
            .then((d) => {
                if (cancelled) return
                setDetail(d)
            })
            .catch((err) => {
                if (cancelled) return
                setError(err instanceof Error ? err.message : "failed to load")
            })
            .finally(() => {
                if (!cancelled) setDetailLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [api, activeID, detailTick])

    async function onLeaveOrDelete() {
        if (!detail || !user) return
        const isOwner = detail.ownerID === user.userID
        const ok = window.confirm(
            isOwner
                ? `Delete "${detail.name}"? This removes it for every member.`
                : `Leave "${detail.name}"?`
        )
        if (!ok) return
        setActionBusy(true)
        try {
            if (isOwner) await deleteCompetition(api, detail.id)
            else await leaveCompetition(api, detail.id)
            setActiveID(null)
            setDetail(null)
            reload()
            navigate("/dashboard")
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setActionBusy(false)
        }
    }

    const isOwner = detail?.ownerID === user?.userID
    const colors = detail
        ? buildColorMap(detail.members.map((m) => m.userID))
        : {}

    return (
        <main className="flex-1 px-9 py-7">
            {error && (
                <div className="card mb-5 bg-coral-soft p-4 text-[13px] text-coral-ink">
                    {error}
                </div>
            )}
            {detail ? (
                <Header
                    competition={detail}
                    isOwner={isOwner}
                    onAction={onLeaveOrDelete}
                    busy={actionBusy}
                />
            ) : (
                <div className="mb-7">
                    <div className="eyebrow mb-2">COMPETITION</div>
                    <h1 className="display m-0 text-[40px]">
                        {competitions.length === 0
                            ? "No competitions yet."
                            : "Pick a competition."}
                    </h1>
                </div>
            )}

            {detail ? (
                <CompetitionBoard
                    competition={detail}
                    isOwner={isOwner}
                    meID={user?.userID}
                    colors={colors}
                    refreshKey={detailTick}
                    onChanged={() => setDetailTick((t) => t + 1)}
                />
            ) : (
                <div className="card p-6 text-[13px] text-ink-3">
                    {detailLoading
                        ? "Loading…"
                        : competitions.length === 0
                          ? "Create or join a competition from the sidebar to get started."
                          : "Select a competition from the sidebar to see its standings and shared goals."}
                </div>
            )}
        </main>
    )
}

function messageFor(err: unknown): string {
    if (err instanceof ApiError) return err.messages.join(", ")
    if (err instanceof Error) return err.message
    return "Something went wrong"
}
