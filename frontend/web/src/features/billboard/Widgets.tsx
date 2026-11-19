// Full-screen billboard widgets, one per route. Each fills the viewport and
// refreshes on its own, so it can be left up on a TV.

import { useAtomValue } from "jotai"
import { useParams } from "react-router-dom"
import { type Goal, type Habit, listHabits, useApi } from "@shared/index"
import { userAtom } from "../../auth"
import { CompetitionBoard } from "./components/CompetitionBoard"
import { GoalCard } from "./components/GoalCard"
import { Heatmap } from "./components/Heatmap"
import { WidgetFrame } from "./components/WidgetFrame"
import { CheckDot, Placeholder } from "./components/primitives"
import { loadCompetition, loadGoals } from "./data"
import { daysDone, goalKey, streakText } from "./format"
import { HABIT_DAYS, HABIT_PALETTE } from "./grid"
import { useElementSize, useLive } from "./hooks"

/** Columns × rows that keep [n] goal cards close to the screen's shape. */
function gridShape(n: number) {
    const cols = n <= 3 ? Math.max(1, n) : n === 4 ? 2 : n <= 6 ? 3 : 4
    return { cols, rows: Math.ceil(n / cols) }
}

/** Goal cards tiled to fill their box, with more rows than columns when it's taller than wide. */
function GoalsGrid({ goals }: { goals: Goal[] }) {
    const [ref, { width, height }] = useElementSize<HTMLDivElement>()
    const shape = gridShape(goals.length)
    const { cols, rows } =
        height > width ? { cols: shape.rows, rows: shape.cols } : shape
    return (
        <div
            ref={ref}
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
}

/** Every goal as a card, tiled to fill the screen. */
export function GoalsWidget() {
    const api = useApi()
    const live = useLive("goals", () => loadGoals(api))

    return (
        <WidgetFrame title="Goals" live={live}>
            {(goals) =>
                goals.length === 0 ? (
                    <Placeholder>No goals yet.</Placeholder>
                ) : (
                    <GoalsGrid goals={goals} />
                )
            }
        </WidgetFrame>
    )
}

/** Grid gap and card padding / header height, in em. */
const HABIT_GAP = 1.4
const HABIT_PAD = 1.6
const HABIT_HEAD = 4.2

/**
 * Columns for [n] habit cards in a [width] × [height] box, chosen so the
 * heatmap cells come out as large as they can: one column of wide rows when
 * there's height to spare, side-by-side blocks when there isn't.
 */
function habitCols(n: number, width: number, height: number, em: number) {
    let best = 1
    let bestCell = 0
    for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols)
        const w =
            (width - (cols - 1) * HABIT_GAP * em) / cols - 2 * HABIT_PAD * em
        const h =
            (height - (rows - 1) * HABIT_GAP * em) / rows -
            2 * HABIT_PAD * em -
            HABIT_HEAD * em
        // The heatmap's fit-mode proportions: 53 weeks + labels by 7 days + labels.
        const cell = Math.min(w / 65.4, h / 9.8)
        if (cell > bestCell * 1.02) {
            best = cols
            bestCell = cell
        }
    }
    return best
}

/** One habit as a large card: name and stats on top, heatmap filling the rest. */
function HabitTile({
    habit,
    start,
    today
}: {
    habit: Habit
    start: string
    today: string
}) {
    const palette = HABIT_PALETTE[habit.color]
    return (
        <div
            className="card flex min-h-0 min-w-0 flex-col gap-[1em]"
            style={{ padding: `${HABIT_PAD}em` }}
        >
            <div className="flex shrink-0 items-center gap-[1em]">
                <CheckDot
                    done={habit.done.at(-1) ?? false}
                    fill={palette.fill}
                    on={palette.on}
                    size="2.6em"
                />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[1.6em] font-semibold leading-tight tracking-[-0.01em]">
                        {habit.name}
                    </div>
                    <div className="mono truncate text-[0.95em] text-ink-3">
                        {daysDone(habit.total)}
                    </div>
                </div>
                {/* No streak, no figure: a bare 0 would only fill the corner. */}
                {habit.streak > 0 && (
                    <div
                        className="shrink-0 text-right"
                        role="img"
                        aria-label={streakText(habit.streak)}
                    >
                        <div className="mono text-[2.4em] font-bold leading-none tracking-[-0.03em]">
                            {habit.streak}
                        </div>
                        <div className="mt-[0.25em] text-[0.8em] text-ink-3">
                            day streak
                        </div>
                    </div>
                )}
            </div>
            <div className="min-h-0 flex-1">
                <Heatmap
                    start={start}
                    today={today}
                    done={habit.done}
                    fill={palette.fill}
                />
            </div>
        </div>
    )
}

/** Habit cards tiled to fill their box, in whatever column count makes them largest. */
function HabitsGrid({
    habits,
    start,
    today
}: {
    habits: Habit[]
    start: string
    today: string
}) {
    const [ref, { width, height }] = useElementSize<HTMLDivElement>()
    // WidgetFrame's base size, clamp(12px, 1.75vmin, 56px). The grid fills the
    // frame, so a window resize re-renders this through the size observer.
    const em = Math.min(
        56,
        Math.max(12, 0.0175 * Math.min(window.innerWidth, window.innerHeight))
    )
    const cols = habitCols(habits.length, width, height, em)
    const rows = Math.ceil(habits.length / cols)
    return (
        <div
            ref={ref}
            className="grid h-full"
            style={{
                gap: `${HABIT_GAP}em`,
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
            }}
        >
            {habits.map((habit) => (
                <HabitTile
                    key={habit.id}
                    habit={habit}
                    start={start}
                    today={today}
                />
            ))}
        </div>
    )
}

/** Every habit's year-long heatmap as a card, tiled to fill the screen. */
export function HabitsWidget() {
    const api = useApi()
    const live = useLive("habits", () => listHabits(api, HABIT_DAYS))

    return (
        <WidgetFrame title="Habits" live={live}>
            {(data) =>
                data.habits.length === 0 ? (
                    <Placeholder>No habits yet.</Placeholder>
                ) : (
                    <HabitsGrid
                        habits={data.habits}
                        start={data.start}
                        today={data.today}
                    />
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
                        <div className="card flex flex-wrap items-center gap-x-[3em] gap-y-[1em] px-[2em] py-[1.4em]">
                            <div className="flex items-center gap-[1em]">
                                <CheckDot
                                    done={doneToday}
                                    fill={palette.fill}
                                    on={palette.on}
                                    size="3.6em"
                                />
                                <div className="text-[1.3em] font-semibold">
                                    {doneToday
                                        ? "Done today"
                                        : "Not done yet today"}
                                </div>
                            </div>
                            <div className="ml-auto flex gap-[3em]">
                                {/* Absent without a streak, as in the app. */}
                                {habit.streak > 0 && (
                                    <Stat
                                        label="Day streak"
                                        value={`${habit.streak}`}
                                    />
                                )}
                                <Stat
                                    label="Days done"
                                    value={`${habit.total}`}
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
