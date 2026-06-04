// App shell sidebar — shared by Dashboard, Competition, and the Integration pages.

import { type ReactNode, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
    type CompetitionSummary,
    type Goal,
    getIntegration,
    type IntegrationStatus,
    type SelfResponse,
    useApi
} from "@shared/index"
import { CompetitionDialog } from "../competition/components/CompetitionDialog"
import {
    formatRefreshed,
    goalTitle,
    integrationVisual,
    isOnTrack
} from "../dashboard/types"
import { IntegrationIcon, LogoLink, SourceTile, Spinner } from "./primitives"

/** Number of competitions shown inline before collapsing into a "View all" link. */
const COMPETITION_PREVIEW = 5

/** Small icon-only button used for the per-section "+ New" and per-row refresh. */
function MiniButton({
    title,
    onClick,
    children,
    disabled = false
}: {
    title: string
    onClick?: () => void
    children: ReactNode
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            disabled={disabled}
            className="grid h-6 w-6 place-items-center rounded-[7px] border border-line bg-bg-card text-[13px] text-ink-3 hover:bg-bg-sunken disabled:opacity-50"
        >
            {children}
        </button>
    )
}

function SectionHeader({
    title,
    loading,
    action
}: {
    title: string
    loading?: boolean
    action?: ReactNode
}) {
    return (
        <div className="mb-3 flex items-center justify-between">
            <div className="eyebrow flex items-center gap-2">
                <span>{title}</span>
                {loading && <Spinner />}
            </div>
            {action}
        </div>
    )
}

/** Account button with a dropdown: Profile · Settings · Log Out. */
function UserMenu({
    user,
    streak,
    onSignOut
}: {
    user: SelfResponse | null
    streak: number
    onSignOut?: () => void
}) {
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const initial = (user?.username[0] ?? "?").toUpperCase()
    const displayName = user?.username ?? "Signed out"

    function go(to: string) {
        setOpen(false)
        navigate(to)
    }

    const item =
        "block w-full rounded-[8px] px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-bg-sunken"

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                style={{ font: "inherit" }}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-none bg-bg-sunken px-2.5 py-2 text-left"
            >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-lime text-[13px] font-semibold text-ink">
                    {initial}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">
                        {displayName}
                    </div>
                    <div className="text-[11px] text-ink-3">
                        streak {streak}d
                    </div>
                </div>
                <span className="text-[12px] text-ink-3">⌄</span>
            </button>

            {open && (
                <>
                    <button
                        type="button"
                        aria-hidden
                        tabIndex={-1}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-40 cursor-default border-none bg-transparent"
                    />
                    <div
                        role="menu"
                        className="card absolute left-0 right-0 top-[calc(100%+6px)] z-50 flex flex-col gap-0.5 p-1.5"
                    >
                        <button
                            type="button"
                            role="menuitem"
                            className={item}
                            onClick={() => go("/profile")}
                        >
                            Profile
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            className={item}
                            onClick={() => go("/settings")}
                        >
                            Settings
                        </button>
                        {onSignOut && (
                            <button
                                type="button"
                                role="menuitem"
                                className={item}
                                onClick={() => {
                                    setOpen(false)
                                    onSignOut()
                                }}
                            >
                                Log Out
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

function GoalItem({ goal }: { goal: Goal }) {
    const visual = integrationVisual(goal.integration)
    const onTrack = isOnTrack(goal)
    const done = goal.progress >= goal.target

    let sub: string
    let tone: string
    if (done) {
        sub = `${goal.progress} / ${goal.target} · done ✓`
        tone = "text-lime-ink"
    } else if (!onTrack) {
        sub = `${goal.progress} / ${goal.target} · behind`
        tone = "text-coral-ink"
    } else {
        sub = `${goal.progress} / ${goal.target} · ${
            goal.period === "DAILY" ? "today" : "this week"
        }`
        tone = "text-ink-3"
    }

    return (
        <div className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2">
            <SourceTile
                label={visual.glyph}
                variant={visual.tile}
                icon={<IntegrationIcon name={goal.integration} />}
            />
            <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">
                    {goalTitle(goal)}
                </div>
                <div className={`truncate text-[11px] ${tone}`}>{sub}</div>
            </div>
        </div>
    )
}

function CompetitionItem({ comp }: { comp: CompetitionSummary }) {
    return (
        <Link
            to={`/competition?c=${comp.id}`}
            className="flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-inherit no-underline hover:bg-bg-sunken"
        >
            <div
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--ink)" }}
            />
            <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">
                    {comp.name}
                </div>
                <div className="truncate text-[11px] text-ink-3">
                    code · {comp.joinCode}
                </div>
            </div>
        </Link>
    )
}

function IntegrationItem({
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
        ? "not connected"
        : integration.lastFetched
          ? `refreshed ${formatRefreshed(integration.lastFetched)}`
          : "never refreshed"

    return (
        <div className="relative">
            <Link
                to={`/integrations/${integration.name}`}
                className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 pr-9 text-inherit no-underline hover:bg-bg-sunken"
            >
                <SourceTile
                    label={visual.glyph}
                    variant={visual.tile}
                    icon={<IntegrationIcon name={integration.name} />}
                />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">
                        {visual.sourceLabel}
                    </div>
                    <div className="truncate text-[11px] text-ink-3">{sub}</div>
                </div>
            </Link>
            {integration.enabled && (
                <button
                    type="button"
                    title="Refresh now"
                    aria-label={`Refresh ${visual.sourceLabel}`}
                    disabled={busy}
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onRefresh()
                    }}
                    className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-[7px] border border-line bg-bg-card text-[13px] text-ink-3 hover:bg-bg-sunken disabled:opacity-50"
                >
                    {busy ? <Spinner size={12} /> : "↻"}
                </button>
            )}
        </div>
    )
}

export function Sidebar({
    onSignOut,
    onNewGoal,
    onReload,
    user,
    goals,
    streak,
    competitions,
    integrations = [],
    loading = false
}: {
    onSignOut?: () => void
    onNewGoal?: () => void
    /** Reload the host page's data after a sidebar-triggered refresh. */
    onReload?: () => void
    user: SelfResponse | null
    goals: Goal[]
    streak: number
    competitions: CompetitionSummary[]
    integrations?: IntegrationStatus[]
    loading?: boolean
}) {
    const api = useApi()
    const navigate = useNavigate()

    const [refreshing, setRefreshing] = useState<string | null>(null)
    const [dialogMode, setDialogMode] = useState<"create" | "join" | null>(null)

    const shownCompetitions = competitions.slice(0, COMPETITION_PREVIEW)
    const hasMoreCompetitions = competitions.length > COMPETITION_PREVIEW

    async function refreshIntegration(name: string) {
        setRefreshing(name)
        try {
            await getIntegration(api, name)
            onReload?.()
        } catch {
            // best-effort; the integration page surfaces detailed errors
        } finally {
            setRefreshing(null)
        }
    }

    return (
        <aside className="flex w-[280px] flex-col gap-7 border-r border-line-2 bg-bg px-5 py-6">
            <LogoLink size={16} />

            <UserMenu user={user} streak={streak} onSignOut={onSignOut} />

            <div>
                <SectionHeader
                    title="MY GOALS"
                    loading={loading}
                    action={
                        <MiniButton title="New goal" onClick={onNewGoal}>
                            +
                        </MiniButton>
                    }
                />
                <div className="flex flex-col gap-1">
                    {goals.length === 0 ? (
                        <div className="px-2.5 py-2 text-[12px] text-ink-3">
                            {loading ? "Loading…" : "No goals yet."}
                        </div>
                    ) : (
                        goals.map((g) => (
                            <GoalItem
                                key={`${g.integration}:${g.metric}:${g.period}`}
                                goal={g}
                            />
                        ))
                    )}
                </div>
            </div>

            <div>
                <SectionHeader
                    title="COMPETITIONS"
                    loading={loading}
                    action={
                        <MiniButton
                            title="New competition"
                            onClick={() => setDialogMode("create")}
                        >
                            +
                        </MiniButton>
                    }
                />
                <div className="flex flex-col gap-1">
                    {competitions.length === 0 ? (
                        <div className="px-2.5 py-2 text-[12px] text-ink-3">
                            {loading ? "Loading…" : "None yet."}
                        </div>
                    ) : (
                        shownCompetitions.map((c) => (
                            <CompetitionItem key={c.id} comp={c} />
                        ))
                    )}

                    {hasMoreCompetitions && (
                        <Link
                            to="/competitions"
                            className="px-2.5 py-1.5 text-[12px] font-medium text-ink-3 no-underline hover:text-ink"
                        >
                            View all {competitions.length} →
                        </Link>
                    )}

                    <button
                        type="button"
                        onClick={() => setDialogMode("join")}
                        className="btn btn-line btn-sm mt-1.5 justify-start"
                    >
                        Join with code
                    </button>
                </div>
            </div>

            <div>
                <SectionHeader title="INTEGRATIONS" loading={loading} />
                <div className="flex flex-col gap-1">
                    {integrations.length === 0 ? (
                        <div className="px-2.5 py-2 text-[12px] text-ink-3">
                            {loading ? "Loading…" : "None available."}
                        </div>
                    ) : (
                        integrations.map((it) => (
                            <IntegrationItem
                                key={it.name}
                                integration={it}
                                busy={refreshing === it.name}
                                onRefresh={() => refreshIntegration(it.name)}
                            />
                        ))
                    )}
                </div>
            </div>

            {dialogMode && (
                <CompetitionDialog
                    initialMode={dialogMode}
                    onClose={() => setDialogMode(null)}
                    onDone={(id) => {
                        setDialogMode(null)
                        onReload?.()
                        navigate(`/competition?c=${id}`)
                    }}
                />
            )}
        </aside>
    )
}
