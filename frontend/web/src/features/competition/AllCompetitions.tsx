// All-competitions page — full-page list of every competition the user belongs to.
// Linked from the sidebar's "View all" affordance once the inline preview overflows.

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAppData } from "../common/AppShell"
import { CompetitionDialog } from "./components/CompetitionDialog"

export default function AllCompetitions() {
    const navigate = useNavigate()
    const { data, loading, reload } = useAppData()
    const [dialogMode, setDialogMode] = useState<"create" | "join" | null>(null)

    const competitions = data.competitions

    return (
        <main className="flex-1 px-9 py-7">
            <div className="mb-7 flex items-start justify-between">
                <div>
                    <div className="eyebrow mb-2">COMPETITIONS</div>
                    <h1 className="display m-0 text-[40px]">
                        All competitions
                    </h1>
                    <div className="mt-2 text-[13px] text-ink-3">
                        {competitions.length} total
                    </div>
                </div>
                <div className="flex gap-2.5">
                    <button
                        type="button"
                        onClick={() => setDialogMode("join")}
                        className="btn btn-line btn-sm"
                    >
                        Join with code
                    </button>
                    <button
                        type="button"
                        onClick={() => setDialogMode("create")}
                        className="btn btn-primary btn-sm"
                    >
                        + New competition
                    </button>
                </div>
            </div>

            {competitions.length === 0 ? (
                <div className="card p-6 text-[13px] text-ink-3">
                    {loading
                        ? "Loading…"
                        : "You're not in any competitions yet."}
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-4">
                    {competitions.map((c) => (
                        <Link
                            key={c.id}
                            to={`/competition?c=${c.id}`}
                            className="card flex flex-col gap-2 p-5 text-inherit no-underline hover:border-line-2"
                        >
                            <div className="text-[16px] font-semibold tracking-[-0.01em]">
                                {c.name}
                            </div>
                            <div className="mono text-[12px] text-ink-3">
                                code · {c.joinCode}
                            </div>
                            <div className="mt-1 text-[12px] font-medium text-ink-3">
                                Open →
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {dialogMode && (
                <CompetitionDialog
                    initialMode={dialogMode}
                    onClose={() => setDialogMode(null)}
                    onDone={(id) => {
                        setDialogMode(null)
                        reload()
                        navigate(`/competition?c=${id}`)
                    }}
                />
            )}
        </main>
    )
}
