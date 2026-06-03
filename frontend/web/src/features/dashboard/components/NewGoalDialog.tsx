// New goal dialog — modal form that creates a goal via the goals API.
// Sources are limited to the metrics the backend actually supports.

import { useState } from "react"
import {
    ApiError,
    createGoal,
    type GoalPeriod,
    useApi
} from "@shared/index"
import { SourceTile, type TileVariant } from "../../common/primitives"
import { unitLabel } from "../types"

const METRICS: {
    integration: string
    metric: string
    label: string
    sub: string
    glyph: string
    tile: TileVariant
}[] = [
    { integration: "github", metric: "commits", label: "GitHub", sub: "commits", glyph: "GH", tile: "ink" },
    { integration: "leetcode", metric: "easy", label: "LeetCode", sub: "easy", glyph: "LC", tile: "lime" },
    { integration: "leetcode", metric: "medium", label: "LeetCode", sub: "medium", glyph: "LC", tile: "lime" },
    { integration: "leetcode", metric: "hard", label: "LeetCode", sub: "hard", glyph: "LC", tile: "lime" }
]

export function NewGoalDialog({
    onClose,
    onCreated
}: {
    onClose: () => void
    onCreated: () => void
}) {
    const api = useApi()
    const [selected, setSelected] = useState(0)
    const [period, setPeriod] = useState<GoalPeriod>("WEEKLY")
    const [target, setTarget] = useState("5")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    const choice = METRICS[selected]
    const targetNum = Number(target)
    const unit = unitLabel(choice.integration, choice.metric)
    const cadence = period === "DAILY" ? "day" : "week"

    async function submit() {
        if (!Number.isFinite(targetNum) || targetNum <= 0) {
            setErrors(["Enter a target greater than zero."])
            return
        }
        setErrors([])
        setSubmitting(true)
        try {
            await createGoal(api, {
                integration: choice.integration,
                metric: choice.metric,
                period,
                target: targetNum
            })
            onCreated()
            onClose()
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.messages)
            else if (err instanceof Error) setErrors([err.message])
            else setErrors(["Something went wrong"])
        } finally {
            setSubmitting(false)
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
                        New goal
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
                    Track a metric from one of your connected sources.
                </p>

                <div className="eyebrow mb-2.5">SOURCE</div>
                <div className="mb-5 grid grid-cols-2 gap-2">
                    {METRICS.map((m, i) => (
                        <button
                            key={`${m.integration}:${m.metric}`}
                            type="button"
                            onClick={() => setSelected(i)}
                            style={{ font: "inherit" }}
                            className={`flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left ${
                                selected === i
                                    ? "border-ink bg-bg-sunken"
                                    : "border-line bg-bg-card"
                            }`}
                        >
                            <SourceTile label={m.glyph} variant={m.tile} />
                            <div className="min-w-0">
                                <div className="text-[13px] font-semibold">
                                    {m.label}
                                </div>
                                <div className="text-[11px] text-ink-3">
                                    {m.sub}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="eyebrow mb-2.5">CADENCE</div>
                <div className="mb-5 flex gap-2">
                    {(["DAILY", "WEEKLY"] as GoalPeriod[]).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPeriod(p)}
                            style={{ font: "inherit" }}
                            className={`flex-1 rounded-[10px] border px-3 py-2.5 text-[13px] font-semibold ${
                                period === p
                                    ? "border-ink bg-bg-sunken"
                                    : "border-line bg-bg-card"
                            }`}
                        >
                            {p === "DAILY" ? "Daily" : "Weekly"}
                        </button>
                    ))}
                </div>

                <div className="eyebrow mb-2.5">TARGET</div>
                <div className="flex items-center gap-2.5">
                    <input
                        type="number"
                        min={1}
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        className="w-24 rounded-[10px] border border-line bg-bg-card px-3.5 py-[11px] text-sm font-[inherit] text-ink outline-0"
                    />
                    <span className="text-[13px] text-ink-3">
                        {unit} / {cadence}
                    </span>
                </div>

                {errors.length > 0 && (
                    <ul
                        role="alert"
                        className="mt-4 flex list-none flex-col gap-1 rounded-[10px] bg-coral-soft p-3 text-xs text-coral-ink"
                    >
                        {errors.map((m, i) => (
                            <li key={i}>{m}</li>
                        ))}
                    </ul>
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
                        disabled={submitting}
                        className="btn btn-primary"
                    >
                        {submitting ? "Creating…" : "Create goal →"}
                    </button>
                </div>
            </div>
        </div>
    )
}
