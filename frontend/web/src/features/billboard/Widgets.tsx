// Full-screen billboard widgets, one per route. Each fills the viewport and
// refreshes on its own, so it can be left up on a TV.

import { useAtomValue } from "jotai"
import { useParams } from "react-router-dom"
import { listGoals, listHabits, useApi } from "@shared/index"
import { userAtom } from "../../auth"
import { CompetitionBoard } from "./components/CompetitionBoard"
import { GoalCard } from "./components/GoalCard"
import { Heatmap } from "./components/Heatmap"
import { WidgetFrame } from "./components/WidgetFrame"
import { CheckDot, Placeholder } from "./components/primitives"
import { loadCompetition } from "./data"
import { goalKey, streakLabel } from "./format"
import { HABIT_DAYS, HABIT_PALETTE } from "./grid"
import { useLive } from "./hooks"

/** Columns × rows that keep [n] goal cards close to the screen's shape. */
function gridShape(n: number) {
    const cols = n <= 3 ? Math.max(1, n) : n === 4 ? 2 : n <= 6 ? 3 : 4
    return { cols, rows: Math.ceil(n / cols) }
}

/** Every goal as a card, tiled to fill the screen. */
export function GoalsWidget() {
    const api = useApi()
    const live = useLive("goals", () => listGoals(api))

    return (
        <WidgetFrame title="Goals" live={live}>
            {(goals) => {
                if (goals.length === 0)
                    return <Placeholder>No goals yet.</Placeholder>
                const { cols, rows } = gridShape(goals.length)
                return (
                    <div
                        className="grid h-full gap-[1.4em]"
                        style={{
                            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
                        }}
                    >
                        {goals.map((goal) => (
                            <GoalCard key={goalKey(goal)} goal={goal} fill />
                        ))}
                    </div>
                )
            }}
        </WidgetFrame>
    )
}

/** Every habit's year-long heatmap, stacked to fill the screen. */
export function HabitsWidget() {
    const api = useApi()
    const live = useLive("habits", () => listHabits(api, HABIT_DAYS))

    return (
        <WidgetFrame title="Habits" live={live}>
            {(data) =>
                data.habits.length === 0 ? (
                    <Placeholder>No habits yet.</Placeholder>
                ) : (
                    <div className="flex h-full flex-col gap-[1em]">
                        {data.habits.map((habit) => {
                            const palette = HABIT_PALETTE[habit.color]
                            return (
                                <div
                                    key={habit.id}
                                    className="card flex min-h-0 flex-1 items-center gap-[1.6em] px-[1.6em] py-[0.9em]"
                                >
                                    <div className="flex w-[15em] shrink-0 items-center gap-[0.9em]">
                                        <CheckDot
                                            done={habit.done.at(-1) ?? false}
                                            fill={palette.fill}
                                            dark={palette.dark}
                                        />
                                        <div className="min-w-0">
                                            <div className="truncate text-[1.35em] font-semibold">
                                                {habit.name}
                                            </div>
                                            <div className="mono text-[0.9em] text-ink-3">
                                                {streakLabel(habit)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-full min-w-0 flex-1">
                                        <Heatmap
                                            start={data.start}
                                            today={data.today}
                                            done={habit.done}
                                            fill={palette.fill}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )
            }
        </WidgetFrame>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="eyebrow text-[0.8em]">{label}</div>
            <div className="mono mt-[0.2em] text-[2.4em] font-bold leading-none tracking-[-0.03em]">
                {value}
            </div>
        </div>
    )
}

/** One habit, as large as the screen allows. */
export function HabitWidget() {
    const api = useApi()
    const { id } = useParams()
    const live = useLive("habits", () => listHabits(api, HABIT_DAYS))
    const find = (data: NonNullable<typeof live.data>) =>
        data.habits.find((h) => h.id === id)

    return (
        <WidgetFrame title={(data) => find(data)?.name ?? "Habit"} live={live}>
            {(data) => {
                const habit = find(data)
                if (!habit)
                    return (
                        <Placeholder>This habit no longer exists.</Placeholder>
                    )
                const palette = HABIT_PALETTE[habit.color]
                const doneToday = habit.done.at(-1) ?? false
                return (
                    <div className="flex h-full flex-col gap-[1.4em]">
                        <div className="card flex items-center gap-[3em] px-[2em] py-[1.4em]">
                            <div className="flex items-center gap-[1em]">
                                <CheckDot
                                    done={doneToday}
                                    fill={palette.fill}
                                    dark={palette.dark}
                                    size="3.6em"
                                />
                                <div className="text-[1.3em] font-semibold">
                                    {doneToday
                                        ? "Done today"
                                        : "Not done yet today"}
                                </div>
                            </div>
                            <div className="ml-auto flex gap-[3em]">
                                <Stat
                                    label="Streak"
                                    value={`${habit.streak}d`}
                                />
                                <Stat
                                    label="Past year"
                                    value={`${habit.total} days`}
                                />
                            </div>
                        </div>
                        <div className="card min-h-0 flex-1 p-[2em]">
                            <Heatmap
                                start={data.start}
                                today={data.today}
                                done={habit.done}
                                fill={palette.fill}
                            />
                        </div>
                    </div>
                )
            }}
        </WidgetFrame>
    )
}

/** One competition's standings and shared goals, side by side. */
export function CompetitionWidget() {
    const api = useApi()
    const { id = "" } = useParams()
    const user = useAtomValue(userAtom)
    const live = useLive(`competition:${id}`, () => loadCompetition(api, id))

    return (
        <WidgetFrame title={(c) => c.detail.name} live={live}>
            {(competition) => (
                <CompetitionBoard
                    competition={competition}
                    meID={user?.userID}
                    split
                />
            )}
        </WidgetFrame>
    )
}
