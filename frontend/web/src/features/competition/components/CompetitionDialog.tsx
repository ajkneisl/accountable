// Create-or-join competition dialog — replaces the old window.prompt flows with a
// proper modal that offers both a "New" tab (name a competition) and a "Join" tab
// (enter a join code).

import { useState } from "react"
import {
    ApiError,
    createCompetition,
    joinCompetition,
    useApi
} from "@shared/index"

type Mode = "create" | "join"

function messageFor(err: unknown): string {
    if (err instanceof ApiError) return err.messages.join(", ")
    if (err instanceof Error) return err.message
    return "Something went wrong"
}

export function CompetitionDialog({
    initialMode = "create",
    onClose,
    onDone
}: {
    initialMode?: Mode
    onClose: () => void
    /** Called with the resulting competition id after a successful create/join. */
    onDone: (id: string) => void
}) {
    const api = useApi()
    const [mode, setMode] = useState<Mode>(initialMode)
    const [name, setName] = useState("")
    const [code, setCode] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        setError(null)
        setBusy(true)
        try {
            if (mode === "create") {
                const trimmed = name.trim()
                if (!trimmed) {
                    setError("Give your competition a name.")
                    return
                }
                const created = await createCompetition(api, { name: trimmed })
                onDone(created.id)
            } else {
                const trimmed = code.trim()
                if (!trimmed) {
                    setError("Enter a join code.")
                    return
                }
                const joined = await joinCompetition(api, trimmed)
                onDone(joined.id)
            }
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setBusy(false)
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
                        {mode === "create"
                            ? "New competition"
                            : "Join a competition"}
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

                <div className="mb-5 mt-3 flex gap-1.5">
                    {(["create", "join"] as Mode[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => {
                                setMode(m)
                                setError(null)
                            }}
                            style={{ font: "inherit" }}
                            className={`flex-1 rounded-[10px] border px-3 py-2 text-[13px] font-semibold ${
                                mode === m
                                    ? "border-ink bg-bg-sunken"
                                    : "border-line bg-bg-card text-ink-3"
                            }`}
                        >
                            {m === "create" ? "New" : "Join with code"}
                        </button>
                    ))}
                </div>

                {mode === "create" ? (
                    <>
                        <div className="eyebrow mb-2.5">NAME</div>
                        <input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && submit()}
                            placeholder="e.g. Spring grind"
                            className="w-full rounded-[10px] border border-line bg-bg-card px-3.5 py-[11px] text-sm font-[inherit] text-ink outline-0"
                        />
                    </>
                ) : (
                    <>
                        <div className="eyebrow mb-2.5">JOIN CODE</div>
                        <input
                            autoFocus
                            value={code}
                            onChange={(e) =>
                                setCode(e.target.value.toUpperCase())
                            }
                            onKeyDown={(e) => e.key === "Enter" && submit()}
                            placeholder="ABC123"
                            className="mono w-full rounded-[10px] border border-line bg-bg-card px-3.5 py-[11px] text-[15px] tracking-[0.08em] text-ink outline-0"
                        />
                    </>
                )}

                {error && (
                    <div className="mt-4 rounded-[10px] bg-coral-soft p-3 text-xs text-coral-ink">
                        {error}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-line"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy}
                        className="btn btn-primary"
                    >
                        {busy ? "…" : mode === "create" ? "Create →" : "Join →"}
                    </button>
                </div>
            </div>
        </div>
    )
}
