// Add workout dialog — manual entry form for an Apple Fitness workout.
// The same POST endpoint will accept rows from an iOS companion app later.

import { useState } from "react"
import { ApiError, logWorkout, useApi, type WorkoutType } from "@shared/index"

const TYPES: { value: WorkoutType; label: string }[] = [
    { value: "RUN", label: "Run" },
    { value: "WEIGHTLIFTING", label: "Weightlifting" },
    { value: "BASKETBALL", label: "Basketball" },
    { value: "PICKLEBALL", label: "Pickleball" },
    { value: "OTHER", label: "Other" }
]

export function AddWorkoutDialog({
    onClose,
    onCreated
}: {
    onClose: () => void
    onCreated: () => void
}) {
    const api = useApi()
    const [type, setType] = useState<WorkoutType>("RUN")
    const [duration, setDuration] = useState("30")
    const [calories, setCalories] = useState("250")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    const durationNum = Number(duration)
    const caloriesNum = Number(calories)

    async function submit() {
        const issues: string[] = []
        if (!Number.isFinite(durationNum) || durationNum < 0)
            issues.push("Duration must be zero or more.")
        if (!Number.isFinite(caloriesNum) || caloriesNum < 0)
            issues.push("Calories must be zero or more.")
        if (issues.length) {
            setErrors(issues)
            return
        }
        setErrors([])
        setSubmitting(true)
        try {
            await logWorkout(api, {
                type,
                durationMin: durationNum,
                calories: caloriesNum
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
                        Log a workout
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
                    Recorded under Apple Fitness for today.
                </p>

                <div className="eyebrow mb-2.5">TYPE</div>
                <div className="mb-5 grid grid-cols-3 gap-2">
                    {TYPES.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setType(t.value)}
                            style={{ font: "inherit" }}
                            className={`rounded-[10px] border px-3 py-2.5 text-[13px] font-semibold ${
                                type === t.value
                                    ? "border-ink bg-bg-sunken"
                                    : "border-line bg-bg-card"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3">
                    <div>
                        <div className="eyebrow mb-2.5">DURATION</div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={0}
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-20 rounded-[10px] border border-line bg-bg-card px-3.5 py-[11px] text-sm font-[inherit] text-ink outline-0"
                            />
                            <span className="text-[13px] text-ink-3">min</span>
                        </div>
                    </div>
                    <div>
                        <div className="eyebrow mb-2.5">CALORIES</div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={0}
                                value={calories}
                                onChange={(e) => setCalories(e.target.value)}
                                className="w-24 rounded-[10px] border border-line bg-bg-card px-3.5 py-[11px] text-sm font-[inherit] text-ink outline-0"
                            />
                            <span className="text-[13px] text-ink-3">kcal</span>
                        </div>
                    </div>
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
                        {submitting ? "Saving…" : "Log workout →"}
                    </button>
                </div>
            </div>
        </div>
    )
}
