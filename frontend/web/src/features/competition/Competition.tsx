// Competition — real-data view of the authenticated user's competitions.

import { useEffect, useState } from "react"
import { useAtomValue } from "jotai"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
    ApiError,
    type CompetitionDetail,
    type CompetitionGoal,
    deleteCompetition,
    getCompetition,
    leaveCompetition,
    removeCompetitionGoal,
    useApi
} from "@shared/index"
import { userAtom } from "../../auth"
import { useAppData } from "../common/AppShell"
import { goalTitle, integrationVisual } from "../dashboard/types"
import { AddCompetitionGoalDialog } from "./components/AddCompetitionGoalDialog"
import { CompetitionGoalsWeek } from "./components/CompetitionGoalsWeek"

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
        <div className="mb-7 flex items-start justify-between">
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

function MembersCard({
    competition,
    meID
}: {
    competition: CompetitionDetail
    meID?: string
}) {
    const ranked = [...competition.members].sort((a, b) => b.streak - a.streak)
    return (
        <div className="card p-6">
            <div className="eyebrow mb-3.5">MEMBER STREAKS</div>
            <div className="flex flex-col gap-1.5">
                {ranked.map((m, i) => {
                    const isMe = m.userID === meID
                    return (
                        <div
                            key={m.userID}
                            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${
                                isMe ? "bg-bg-sunken" : ""
                            }`}
                        >
                            <div className="mono w-6 text-[13px] text-ink-3">
                                #{i + 1}
                            </div>
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[12px] font-semibold text-bg">
                                {m.username[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[14px] font-semibold">
                                    {m.username}
                                    {isMe && (
                                        <span className="ml-1.5 text-[11px] text-ink-3">
                                            (you)
                                        </span>
                                    )}
                                </div>
                                <div className="text-[11px] text-ink-3">
                                    joined{" "}
                                    {new Date(m.joinedAt).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="mono text-[22px] font-bold tracking-[-0.02em]">
                                {m.streak}
                                <span className="ml-1 text-[12px] text-ink-3">
                                    d
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function goalKey(g: CompetitionGoal): string {
    return `${g.integration}:${g.metric}:${g.period}`
}

function GoalsCard({
    competition,
    isOwner,
    onChanged
}: {
    competition: CompetitionDetail
    isOwner: boolean
    onChanged: () => void
}) {
    const api = useApi()
    const [adding, setAdding] = useState(false)
    const [removing, setRemoving] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function remove(g: CompetitionGoal) {
        if (!window.confirm(`Remove "${goalTitle(asGoal(g))}" from this competition?`))
            return
        setError(null)
        setRemoving(goalKey(g))
        try {
            await removeCompetitionGoal(
                api,
                competition.id,
                g.integration,
                g.metric,
                g.period
            )
            onChanged()
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setRemoving(null)
        }
    }

    return (
        <div className="card p-6">
            <div className="mb-3.5 flex items-center justify-between">
                <div className="eyebrow">SHARED GOALS</div>
                {isOwner && (
                    <button
                        type="button"
                        onClick={() => setAdding(true)}
                        className="btn btn-line btn-sm"
                    >
                        + Add goal
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] bg-coral-soft p-3 text-xs text-coral-ink">
                    {error}
                </div>
            )}

            {competition.goals.length === 0 ? (
                <div className="text-[13px] text-ink-3">
                    {isOwner
                        ? "No goals yet. Add one to start the competition."
                        : "No goals yet. The owner can add them."}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {competition.goals.map((g) => {
                        const visual = integrationVisual(g.integration)
                        return (
                            <div
                                key={goalKey(g)}
                                className="flex items-center gap-3 border-t border-line-2 py-2.5"
                            >
                                <div
                                    className={`source-tile ${visual.tile ? "tile-" + visual.tile : ""}`}
                                >
                                    <span>{visual.glyph}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[14px] font-semibold">
                                        {goalTitle(asGoal(g))}
                                    </div>
                                    <div className="text-[11px] text-ink-3">
                                        {visual.sourceLabel} · {g.metric}
                                    </div>
                                </div>
                                {isOwner && (
                                    <button
                                        type="button"
                                        aria-label="Remove goal"
                                        onClick={() => remove(g)}
                                        disabled={removing === goalKey(g)}
                                        className="grid h-7 w-7 place-items-center rounded-full text-[16px] text-ink-3 hover:bg-bg-sunken disabled:opacity-40"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {adding && (
                <AddCompetitionGoalDialog
                    competitionId={competition.id}
                    onClose={() => setAdding(false)}
                    onAdded={onChanged}
                />
            )}
        </div>
    )
}

/** Adapt a {@link CompetitionGoal} to the shape {@link goalTitle} expects. */
function asGoal(g: CompetitionGoal) {
    return {
        integration: g.integration,
        metric: g.metric,
        period: g.period,
        target: g.target,
        progress: 0,
        vals: [],
        createdAt: g.createdAt
    }
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
                <>
                    <div
                        className="grid gap-4"
                        style={{ gridTemplateColumns: "1.4fr 1fr" }}
                    >
                        <MembersCard competition={detail} meID={user?.userID} />
                        <GoalsCard
                            competition={detail}
                            isOwner={isOwner}
                            onChanged={() => setDetailTick((t) => t + 1)}
                        />
                    </div>
                    <CompetitionGoalsWeek
                        competitionId={detail.id}
                        meID={user?.userID}
                        refreshKey={detailTick}
                    />
                </>
            ) : (
                <div className="card p-6 text-[13px] text-ink-3">
                    {detailLoading
                        ? "Loading…"
                        : competitions.length === 0
                          ? "Create or join a competition from the sidebar to get started."
                          : "Select a competition from the sidebar to see its members and shared goals."}
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
