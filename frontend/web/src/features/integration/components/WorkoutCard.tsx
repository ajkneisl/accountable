// Workout card — today's Apple Fitness workouts with manual entry + delete.

import {
    deleteWorkout,
    useApi,
    type Workout,
    type WorkoutType
} from "@shared/index"
import { IntegrationIcon, SourceTile, Spinner } from "../../common/primitives"

const TYPE_LABEL: Record<WorkoutType, string> = {
    RUN: "Run",
    WEIGHTLIFTING: "Weightlifting",
    BASKETBALL: "Basketball",
    PICKLEBALL: "Pickleball",
    OTHER: "Other"
}

const TIME_FMT = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
})

export function WorkoutCard({
    workouts,
    onAdd,
    onChanged,
    loading = false
}: {
    workouts: Workout[]
    onAdd: () => void
    onChanged: () => void
    loading?: boolean
}) {
    const api = useApi()
    const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0)
    const totalMinutes = workouts.reduce((sum, w) => sum + w.durationMin, 0)

    async function remove(id: string) {
        try {
            await deleteWorkout(api, id)
            onChanged()
        } catch {
            // ignore; UI stays as-is, user can retry
        }
    }

    return (
        <div className="card p-6">
            <div className="mb-4 flex items-start gap-3">
                <SourceTile
                    label="WO"
                    icon={<IntegrationIcon name="apple_fitness" />}
                />
                <div className="flex-1">
                    <div className="eyebrow mb-1.5 flex items-center gap-2">
                        <span>WORKOUTS · TODAY</span>
                        {loading && <Spinner />}
                    </div>
                    <div className="text-[22px] font-semibold tracking-[-0.02em]">
                        {totalCalories.toLocaleString()} kcal
                    </div>
                    <div className="text-[13px] text-ink-3">
                        {workouts.length}{" "}
                        {workouts.length === 1 ? "workout" : "workouts"} ·{" "}
                        {totalMinutes} min
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onAdd}
                    className="btn btn-primary btn-sm"
                >
                    + Add workout
                </button>
            </div>

            {workouts.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-line p-4 text-center text-[13px] text-ink-3">
                    No workouts logged yet today.
                </div>
            ) : (
                <ul className="flex list-none flex-col gap-2 p-0">
                    {workouts.map((w) => (
                        <li
                            key={w.id}
                            className="flex items-center gap-3 rounded-[10px] border border-line bg-bg-card px-3.5 py-2.5"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="text-[14px] font-semibold">
                                    {TYPE_LABEL[w.type]}
                                </div>
                                <div className="text-[11px] text-ink-3">
                                    {TIME_FMT.format(new Date(w.happenedAt))} ·{" "}
                                    {w.durationMin} min ·{" "}
                                    {w.calories.toLocaleString()} kcal
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => remove(w.id)}
                                aria-label={`Remove ${TYPE_LABEL[w.type]} workout`}
                                className="grid h-7 w-7 place-items-center rounded-full text-[16px] text-ink-3 hover:bg-bg-sunken"
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
