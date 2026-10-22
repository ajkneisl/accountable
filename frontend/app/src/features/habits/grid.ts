// Heatmap geometry shared by the in-app heatmap and the widget snapshot.
//
// Columns are Monday-anchored weeks (rows Mon→Sun), GitHub-style, with the last
// column holding the current week. Dates are the backend's `yyyy-MM-dd` strings
// in the user's timezone; they're handled as UTC midnights so device-timezone
// DST shifts can't nudge a day across a boundary.

import type { HabitColor } from "@shared/index"
import { colors } from "../../theme"

const DAY_MS = 86_400_000

/** One heatmap cell. `index` is the day's position in the response window, or -1 outside it. */
export interface Cell {
    date: string
    index: number
    future: boolean
}

function parse(date: string): number {
    const [y, m, d] = date.split("-").map(Number)
    return Date.UTC(y, m - 1, d)
}

function format(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Lay the window ending at [today] out as [cols] week columns. Cells after today
 * are marked `future`; cells before [start] get `index` -1.
 */
export function buildGrid(
    start: string,
    today: string,
    cols: number
): Cell[][] {
    const startMs = parse(start)
    const todayMs = parse(today)
    // getUTCDay: Sun=0 … Sat=6 → Mon=0 … Sun=6.
    const weekday = (new Date(todayMs).getUTCDay() + 6) % 7
    const firstMonday = todayMs - weekday * DAY_MS - (cols - 1) * 7 * DAY_MS

    return Array.from({ length: cols }, (_, c) =>
        Array.from({ length: 7 }, (_, r) => {
            const ms = firstMonday + (c * 7 + r) * DAY_MS
            const index = Math.round((ms - startMs) / DAY_MS)
            return {
                date: format(ms),
                index: ms < startMs || ms > todayMs ? -1 : index,
                future: ms > todayMs
            }
        })
    )
}

/** Fill, soft tint and ink for a habit's accent. */
export const HABIT_PALETTE: Record<
    HabitColor,
    { fill: string; soft: string; ink: string; label: string }
> = {
    LIME: {
        fill: colors.lime,
        soft: colors.limeSoft,
        ink: colors.limeInk,
        label: "Lime"
    },
    CORAL: {
        fill: colors.coral,
        soft: colors.coralSoft,
        ink: colors.coralInk,
        label: "Coral"
    },
    INDIGO: {
        fill: colors.indigo,
        soft: "#dfe3f7",
        ink: colors.indigo,
        label: "Indigo"
    },
    INK: { fill: colors.ink, soft: colors.line, ink: colors.ink, label: "Ink" }
}

export const HABIT_COLORS = Object.keys(HABIT_PALETTE) as HabitColor[]
