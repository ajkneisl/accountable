// GitHub-style, read-only heatmap for one habit: week columns, Mon→Sun rows.
//
// Two sizing modes:
// - fixed [cell]: px-sized cells, as many whole weeks as fit the width (cards)
// - fit (no [cell]): exactly [weeks] columns plus month labels, with the cell
//   size chosen so the grid fills its box (full-screen widgets)

import type { CSSProperties } from "react"
import { useElementSize } from "../hooks"
import { HABIT_WEEKS, buildGrid, monthLabel } from "../grid"

/** Gap between fixed-size cells, in px. */
const GAP = 3

/** Fit mode: gap as a fraction of the cell size. */
const GAP_RATIO = 0.2

/** Fit mode: month label row height, in cells. */
const LABEL_RATIO = 1.4

export function Heatmap({
    start,
    today,
    done,
    fill,
    cell,
    weeks = HABIT_WEEKS
}: {
    start: string
    today: string
    done: boolean[]
    fill: string
    /** Fixed cell size in px; omit to fit the grid to its container. */
    cell?: number
    weeks?: number
}) {
    const [ref, { width, height }] = useElementSize<HTMLDivElement>()
    const fit = cell === undefined

    let cols: number
    let size: number
    let gap: number
    if (fit) {
        cols = weeks
        const raw = Math.min(
            width / (cols + (cols - 1) * GAP_RATIO),
            height / (LABEL_RATIO + 7 + 7 * GAP_RATIO)
        )
        size = Math.floor(raw)
        gap = Math.max(1, Math.floor(raw * GAP_RATIO))
    } else {
        size = cell
        gap = GAP
        cols = Math.min(
            weeks,
            Math.max(1, Math.floor((width + gap) / (size + gap)))
        )
    }
    const labelHeight = Math.floor(size * LABEL_RATIO)
    const radius = Math.max(2, Math.round(size * 0.22))
    const ring = Math.max(1.5, size * 0.12)

    const grid = width > 0 && size > 0 ? buildGrid(start, today, cols) : []

    return (
        <div
            ref={ref}
            className={
                fit
                    ? "flex h-full w-full items-center justify-center overflow-hidden"
                    : "flex w-full justify-end overflow-hidden"
            }
            style={fit ? undefined : { height: 7 * size + 6 * gap }}
        >
            <div className="flex" style={{ gap }}>
                {grid.map((week, c) => {
                    const month = week[0].date.slice(0, 7)
                    const newMonth =
                        c > 0 && month !== grid[c - 1][0].date.slice(0, 7)
                    return (
                        <div
                            key={week[0].date}
                            className="flex flex-col"
                            style={{ gap }}
                        >
                            {fit && (
                                <div
                                    className="mono flex items-end whitespace-nowrap leading-none text-ink-3"
                                    style={{
                                        height: labelHeight,
                                        width: size,
                                        fontSize: size * 0.8
                                    }}
                                >
                                    {newMonth ? monthLabel(week[0].date) : null}
                                </div>
                            )}
                            {week.map((day) => {
                                const box: CSSProperties = {
                                    width: size,
                                    height: size,
                                    borderRadius: radius
                                }
                                if (day.future)
                                    return <div key={day.date} style={box} />
                                const on = day.index >= 0 && done[day.index]
                                return (
                                    <div
                                        key={day.date}
                                        title={day.date}
                                        style={{
                                            ...box,
                                            background: on
                                                ? fill
                                                : "var(--line-2)",
                                            boxShadow:
                                                day.date === today
                                                    ? `inset 0 0 0 ${ring}px var(--ink)`
                                                    : undefined
                                        }}
                                    />
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
