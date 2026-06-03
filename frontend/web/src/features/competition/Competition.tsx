// Competition — real-data view of the authenticated user's competitions.

import { useEffect, useState } from "react"
import { useAtomValue } from "jotai"
import { useNavigate } from "react-router-dom"
import {
    ApiError,
    type CompetitionDetail,
    type CompetitionSummary,
    createCompetition,
    deleteCompetition,
    getCompetition,
    joinCompetition,
    leaveCompetition,
    useApi
} from "@shared/index"
import { useSignOut, userAtom } from "../../auth"
import { Sidebar } from "../common/Sidebar"
import {
    goalTitle,
    integrationVisual
} from "../dashboard/types"
import { useDashboardData } from "../dashboard/useDashboardData"

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

function GoalsCard({ competition }: { competition: CompetitionDetail }) {
    return (
        <div className="card p-6">
            <div className="eyebrow mb-3.5">SHARED GOALS</div>
            {competition.goals.length === 0 ? (
                <div className="text-[13px] text-ink-3">
                    No goals yet. The owner can add them.
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {competition.goals.map((g) => {
                        const visual = integrationVisual(g.integration)
                        return (
                            <div
                                key={`${g.integration}:${g.metric}:${g.period}`}
                                className="flex items-center gap-3 border-t border-line-2 py-2.5"
                            >
                                <div
                                    className={`source-tile ${visual.tile ? "tile-" + visual.tile : ""}`}
                                >
                                    <span>{visual.glyph}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[14px] font-semibold">
                                        {goalTitle({
                                            integration: g.integration,
                                            metric: g.metric,
                                            period: g.period,
                                            target: g.target,
                                            progress: 0,
                                            vals: [],
                                            createdAt: g.createdAt
                                        })}
                                    </div>
                                    <div className="text-[11px] text-ink-3">
                                        {visual.sourceLabel} · {g.metric}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function CompetitionList({
    competitions,
    activeID,
    onSelect,
    onCreate,
    onJoin
}: {
    competitions: CompetitionSummary[]
    activeID: string | null
    onSelect: (id: string) => void
    onCreate: () => void
    onJoin: () => void
}) {
    return (
        <div className="card p-6">
            <div className="mb-3.5 flex items-center justify-between">
                <div className="eyebrow">YOUR COMPETITIONS</div>
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={onJoin}
                        className="btn btn-line btn-sm"
                    >
                        Join
                    </button>
                    <button
                        type="button"
                        onClick={onCreate}
                        className="btn btn-primary btn-sm"
                    >
                        + New
                    </button>
                </div>
            </div>
            {competitions.length === 0 ? (
                <div className="text-[13px] text-ink-3">
                    You're not in any competitions yet.
                </div>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {competitions.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => onSelect(c.id)}
                            style={{ font: "inherit" }}
                            className={`flex w-full items-center justify-between rounded-[10px] border-none px-3 py-2 text-left ${
                                activeID === c.id
                                    ? "bg-bg-sunken"
                                    : "bg-transparent"
                            }`}
                        >
                            <div>
                                <div className="text-[14px] font-semibold">
                                    {c.name}
                                </div>
                                <div className="text-[11px] text-ink-3">
                                    code · {c.joinCode}
                                </div>
                            </div>
                            <span className="text-[12px] text-ink-3">→</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function Competition() {
    const api = useApi()
    const signOut = useSignOut()
    const navigate = useNavigate()
    const user = useAtomValue(userAtom)
    const { data: dashData, loading: dashLoading, reload } = useDashboardData()

    const [activeID, setActiveID] = useState<string | null>(null)
    const [detail, setDetail] = useState<CompetitionDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [actionBusy, setActionBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const competitions = dashData.competitions

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
    }, [api, activeID])

    async function onCreate() {
        const name = window.prompt("Competition name?")
        if (!name) return
        setActionBusy(true)
        try {
            const created = await createCompetition(api, { name })
            setActiveID(created.id)
            reload()
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setActionBusy(false)
        }
    }

    async function onJoin() {
        const code = window.prompt("Join code?")
        if (!code) return
        setActionBusy(true)
        try {
            const joined = await joinCompetition(api, code.trim())
            setActiveID(joined.id)
            reload()
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setActionBusy(false)
        }
    }

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

    if (dashLoading) {
        return (
            <main className="acc flex min-h-screen items-center justify-center">
                <p className="text-ink-3">Loading…</p>
            </main>
        )
    }

    const isOwner = detail?.ownerID === user?.userID

    return (
        <div className="acc mx-auto flex min-h-[1100px] w-[1440px]">
            <Sidebar
                onSignOut={signOut}
                user={user}
                goals={dashData.goals}
                streak={dashData.streak}
                competitions={dashData.competitions}
            />

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

                <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: "1fr 1.4fr 1fr" }}
                >
                    <CompetitionList
                        competitions={competitions}
                        activeID={activeID}
                        onSelect={setActiveID}
                        onCreate={onCreate}
                        onJoin={onJoin}
                    />
                    {detail ? (
                        <>
                            <MembersCard
                                competition={detail}
                                meID={user?.userID}
                            />
                            <GoalsCard competition={detail} />
                        </>
                    ) : (
                        <div className="card p-6 text-[13px] text-ink-3">
                            {detailLoading
                                ? "Loading…"
                                : "Select a competition to see its members and shared goals."}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

function messageFor(err: unknown): string {
    if (err instanceof ApiError) return err.messages.join(", ")
    if (err instanceof Error) return err.message
    return "Something went wrong"
}
