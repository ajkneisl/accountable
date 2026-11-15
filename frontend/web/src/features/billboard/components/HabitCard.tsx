// One habit on the billboard overview, laid out as in the app: today's state
// and the name, the streak as the figure on the right (nothing there without
// one), the heatmap, and the days done as a line under it. Read-only —
// check-ins happen in the app.

import { Link } from "react-router-dom"
import type { Habit } from "@shared/index"
import { daysDone } from "../format"
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
                    on={palette.on}
                />
                <div className="min-w-0 flex-1 truncate text-[1.15em] font-semibold tracking-[-0.01em]">
                    {habit.name}
                </div>
                {/* No streak, no figure: a bare 0 would only fill the corner. */}
                {habit.streak > 0 && (
                    <div
                        className="text-right"
                        role="img"
                        aria-label={`${habit.streak}-day streak`}
                    >
                        <div className="mono text-[2em] font-bold leading-none tracking-[-0.03em]">
                            {habit.streak}
                        </div>
                        <div className="text-[0.8em] text-ink-3">
                            day streak
                        </div>
                    </div>
                )}
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

            <div className="mono text-center text-[0.85em]">
                {daysDone(habit.total)}
            </div>
        </div>
    )
}
