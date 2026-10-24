// Heatmap geometry, mirroring app/src/features/habits/grid.ts.
//
// Columns are Monday-anchored weeks (rows Mon→Sun), GitHub-style, with the last
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

/** Short month name ("Jan") for a `yyyy-MM-dd` date. */
export function monthLabel(date: string): string {
    return new Date(parse(date)).toLocaleDateString(undefined, {
        month: "short",
        timeZone: "UTC"
    })
}

/** Fill and ink for a habit's accent. `dark` fills need a light check mark. */
export const HABIT_PALETTE: Record<
    HabitColor,
    { fill: string; ink: string; dark: boolean }
> = {
    LIME: { fill: "var(--lime)", ink: "var(--lime-ink)", dark: false },
    CORAL: { fill: "var(--coral)", ink: "var(--coral-ink)", dark: false },
    INDIGO: { fill: "var(--indigo)", ink: "var(--indigo)", dark: true },
    INK: { fill: "var(--ink)", ink: "var(--ink)", dark: true },
    AMBER: { fill: "#f5b82e", ink: "#6b4700", dark: false },
    TEAL: { fill: "#14a39a", ink: "#00524c", dark: false },
    SKY: { fill: "#4aa8f0", ink: "#0b4a7a", dark: false },
    PLUM: { fill: "#8e3fa8", ink: "#8e3fa8", dark: true }
}
