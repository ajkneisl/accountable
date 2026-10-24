// One habit on the billboard overview: name, streak, today's state, and its
// heatmap. Read-only — check-ins happen in the app.

import { Link } from "react-router-dom"
import type { Habit } from "@shared/index"
import { streakLabel } from "../format"
import { HABIT_PALETTE } from "../grid"
import { Heatmap } from "./Heatmap"
import { CheckDot } from "./primitives"

export function HabitCard({
    habit,
    start,
    today
}: {
    habit: Habit
    start: string
    today: string
}) {
    const palette = HABIT_PALETTE[habit.color]
    const doneToday = habit.done[habit.done.length - 1] ?? false

    return (
        <div className="card flex flex-col gap-[1.1em] p-[1.4em]">
            <div className="flex items-center gap-[0.85em]">
                <CheckDot
                    done={doneToday}
                    fill={palette.fill}
                    dark={palette.dark}
                />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[1.15em] font-semibold">
                        {habit.name}
                    </div>
                    <div className="mono text-[0.85em] text-ink-3">
                        {streakLabel(habit)}
                    </div>
                </div>
                <Link
                    to={`/billboard/habits/${habit.id}`}
                    className="btn btn-line btn-sm"
                >
                    Full screen ↗
                </Link>
            </div>

            <Heatmap
                start={start}
                today={today}
                done={habit.done}
                fill={palette.fill}
                cell={13}
            />
        </div>
    )
}
