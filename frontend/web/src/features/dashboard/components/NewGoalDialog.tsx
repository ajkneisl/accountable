// Goal dialog — a reusable modal form for composing an integration goal.
// `GoalDialog` owns the source/metric/cadence/target form; callers supply what
// happens on submit. `NewGoalDialog` is the personal-goal flavor (creates a goal
// via the goals API); competitions reuse `GoalDialog` with their own submit.
// Sources are limited to the metrics the backend actually supports.

import { useState } from "react"
import {
    ApiError,
    createGoal,
    type GoalPeriod,
    useApi
} from "@shared/index"
import { IntegrationIcon, SourceTile, type TileVariant } from "../../common/primitives"
import { unitLabel } from "../types"

type Source = {
    integration: string
    label: string
    glyph: string
    tile: TileVariant
    /** Eyebrow label for the metric chips row when there are multiple metrics. */
    optionLabel: string
    metrics: { metric: string; label: string }[]
}

const SOURCES: Source[] = [
    {
        integration: "github",
        label: "GitHub",
        glyph: "GH",
        tile: "ink",
        optionLabel: "METRIC",
        metrics: [{ metric: "commits", label: "Commits" }]
    },
    {
        integration: "leetcode",
        label: "LeetCode",
        glyph: "LC",
        tile: "lime",
        optionLabel: "DIFFICULTY",
        metrics: [
            { metric: "easy", label: "Easy" },
            { metric: "medium", label: "Medium" },
            { metric: "hard", label: "Hard" }
        ]
    },
    {
        integration: "apple_fitness",
        label: "Workout",
        glyph: "WO",
        tile: "",
        optionLabel: "METRIC",
        metrics: [
            { metric: "workouts", label: "Workouts" },
            { metric: "calories", label: "Calories" }
        ]
    }
]

/** The goal a {@link GoalDialog} composes, handed to its `onSubmit`. */
export interface GoalDraft {
    integration: string
    metric: string
    period: GoalPeriod
    target: number
}

/**
 * Reusable goal-composition modal. The form (source, metric, cadence, target) is
 * fixed; [onSubmit] decides what to do with the resulting {@link GoalDraft} and is
 * responsible for closing the dialog on success. Thrown errors are surfaced inline.
 */
export function GoalDialog({
    title,
    description,
    submitLabel,
    submittingLabel,
    onSubmit,
    onClose
}: {
    title: string
    description: string
    submitLabel: string
    submittingLabel: string
    onSubmit: (draft: GoalDraft) => Promise<void>
    onClose: () => void
}) {
    const [sourceIdx, setSourceIdx] = useState(0)
    const [metric, setMetric] = useState(SOURCES[0].metrics[0].metric)
    const [period, setPeriod] = useState<GoalPeriod>("WEEKLY")
    const [target, setTarget] = useState("5")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    const source = SOURCES[sourceIdx]
    const targetNum = Number(target)
    const unit = unitLabel(source.integration, metric)
    const cadence = period === "DAILY" ? "day" : "week"

    function pickSource(i: number) {
        setSourceIdx(i)
        setMetric(SOURCES[i].metrics[0].metric)
    }

    async function submit() {
        if (!Number.isFinite(targetNum) || targetNum <= 0) {
            setErrors(["Enter a target greater than zero."])
            return
        }
        setErrors([])
        setSubmitting(true)
        try {
            await onSubmit({
                integration: source.integration,
                metric,
                period,
                target: targetNum
            })
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
                        {title}
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
                <p className="mb-5 mt-0 text-[13px] text-ink-3">{description}</p>

                <div className="eyebrow mb-2.5">SOURCE</div>
                <div className="mb-5 grid grid-cols-2 gap-2">
                    {SOURCES.map((s, i) => (
                        <button
                            key={s.integration}
                            type="button"
                            onClick={() => pickSource(i)}
                            style={{ font: "inherit" }}
                            className={`flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left ${
                                sourceIdx === i
                                    ? "border-ink bg-bg-sunken"
                                    : "border-line bg-bg-card"
                            }`}
                        >
                            <SourceTile
                                label={s.glyph}
                                variant={s.tile}
                                icon={<IntegrationIcon name={s.integration} />}
                            />
                            <div className="min-w-0">
                                <div className="text-[13px] font-semibold">
                                    {s.label}
                                </div>
                                <div className="text-[11px] text-ink-3">
                                    {s.metrics.length === 1
                                        ? s.metrics[0].label.toLowerCase()
                                        : `${s.metrics.length} options`}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {source.metrics.length > 1 && (
                    <>
                        <div className="eyebrow mb-2.5">{source.optionLabel}</div>
                        <div className="mb-5 flex gap-2">
                            {source.metrics.map((m) => (
                                <button
                                    key={m.metric}
                                    type="button"
                                    onClick={() => setMetric(m.metric)}
                                    style={{ font: "inherit" }}
                                    className={`flex-1 rounded-[10px] border px-3 py-2.5 text-[13px] font-semibold ${
                                        metric === m.metric
                                            ? "border-ink bg-bg-sunken"
                                            : "border-line bg-bg-card"
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}

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
                        {submitting ? submittingLabel : submitLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

/** Personal-goal dialog — creates a goal for the authenticated user. */
export function NewGoalDialog({
    onClose,
    onCreated
}: {
    onClose: () => void
    onCreated: () => void
}) {
    const api = useApi()
    return (
        <GoalDialog
            title="New goal"
            description="Track a metric from one of your connected sources."
            submitLabel="Create goal →"
            submittingLabel="Creating…"
            onClose={onClose}
            onSubmit={async (draft) => {
                await createGoal(api, draft)
                onCreated()
                onClose()
            }}
        />
    )
}
