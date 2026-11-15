// Heatmap geometry, mirroring app/src/features/habits/grid.ts.
//
// Columns are Sunday-anchored weeks (rows Sun→Sat), GitHub-style, with the last
// column holding the current week. Dates are the backend's `yyyy-MM-dd` strings
// in the user's timezone; they're handled as UTC midnights so browser-timezone
// DST shifts can't nudge a day across a boundary.

import type { HabitColor } from "@shared/index"

const DAY_MS = 86_400_000

/** Habit window the billboard asks for: the backend's maximum, a full year of weeks. */
export const HABIT_DAYS = 371

/** Whole weeks covered by {@link HABIT_DAYS}. */
export const HABIT_WEEKS = 53

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
    // getUTCDay: Sun=0 … Sat=6, which is the row order.
    const weekday = new Date(todayMs).getUTCDay()
    const firstSunday = todayMs - weekday * DAY_MS - (cols - 1) * 7 * DAY_MS

    return Array.from({ length: cols }, (_, c) =>
        Array.from({ length: 7 }, (_, r) => {
            const ms = firstSunday + (c * 7 + r) * DAY_MS
            const index = Math.round((ms - startMs) / DAY_MS)
            return {
                date: format(ms),
                index: ms < startMs || ms > todayMs ? -1 : index,
                future: ms > todayMs
            }
        })
    )
}

/** Short month name ("Jan") for a `yyyy-MM-dd` date. */
export function monthLabel(date: string): string {
    return new Date(parse(date)).toLocaleDateString(undefined, {
        month: "short",
        timeZone: "UTC"
    })
}

/** Short weekday name ("Mon") for a grid row, 0 = Sunday … 6 = Saturday. */
export function weekdayLabel(row: number): string {
    // 2024-01-07 was a Sunday.
    return new Date(Date.UTC(2024, 0, 7 + row)).toLocaleDateString(undefined, {
        weekday: "short",
        timeZone: "UTC"
    })
}

/**
 * Fill and ink for a habit's accent, and what reads [on] the fill (a check
 * mark, a rank number). All of them are theme tokens, so each follows the
 * billboard into dark mode by itself — including the two fills that change
 * there, which bring a different mark with them.
 */
export const HABIT_PALETTE: Record<
    HabitColor,
    { fill: string; ink: string; on: string }
> = {
    LIME: {
        fill: "var(--lime)",
        ink: "var(--lime-ink)",
        on: "var(--on-light-fill)"
    },
    CORAL: {
        fill: "var(--coral)",
        ink: "var(--coral-ink)",
        on: "var(--on-light-fill)"
    },
    INDIGO: {
        fill: "var(--indigo)",
        ink: "var(--indigo)",
        on: "var(--on-indigo)"
    },
    INK: { fill: "var(--ink)", ink: "var(--ink)", on: "var(--on-ink)" },
    AMBER: { fill: "var(--amber)", ink: "#6b4700", on: "var(--on-light-fill)" },
    TEAL: { fill: "var(--teal)", ink: "#00524c", on: "var(--on-light-fill)" },
    SKY: { fill: "var(--sky)", ink: "#0b4a7a", on: "var(--on-light-fill)" },
    PLUM: { fill: "var(--plum)", ink: "var(--plum)", on: "var(--on-dark-fill)" }
}
