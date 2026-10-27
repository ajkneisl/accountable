// Heatmap geometry shared by the in-app heatmap and the widget snapshot.
//
// Columns are Monday-anchored weeks (rows Mon→Sun), GitHub-style, with the last
// column holding the current week. Dates are the backend's `yyyy-MM-dd` strings
// in the user's timezone; they're handled as UTC midnights so device-timezone
// DST shifts can't nudge a day across a boundary.

import type { HabitColor } from "@shared/index"
import { type Palette, palettes, type Scheme, useScheme } from "../../theme"

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

export type HabitSwatch = {
    fill: string
    soft: string
    ink: string
    label: string
    /** The fill needs a light foreground (e.g. the check mark) to stay visible. */
    dark: boolean
}

/** Fill, soft tint and ink for each accent, built from a scheme's palette. */
function habitPalette(
    c: Palette,
    scheme: Scheme
): Record<HabitColor, HabitSwatch> {
    const night = scheme === "dark"
    return {
        LIME: {
            fill: c.lime,
            soft: c.limeSoft,
            ink: c.limeInk,
            label: "Lime",
            dark: false
        },
        CORAL: {
            fill: c.coral,
            soft: c.coralSoft,
            ink: c.coralInk,
            label: "Coral",
            dark: false
        },
        INDIGO: {
            fill: c.indigo,
            soft: night ? "#232a4d" : "#dfe3f7",
            ink: c.indigo,
            label: "Indigo",
            // Lightened for the dark background, so a dark check reads on it.
            dark: !night
        },
        // Ink follows the text color: near-black by day, near-white at night.
        INK: {
            fill: c.ink,
            soft: c.line,
            ink: c.ink,
            label: "Ink",
            dark: !night
        },
        AMBER: {
            fill: "#f5b82e",
            soft: night ? "#3d2f0e" : "#fdefc8",
            ink: night ? "#f8d98a" : "#6b4700",
            label: "Amber",
            dark: false
        },
        TEAL: {
            fill: "#14a39a",
            soft: night ? "#0f2f2c" : "#d2f1ee",
            ink: night ? "#7fd8d1" : "#00524c",
            label: "Teal",
            dark: false
        },
        SKY: {
            fill: "#4aa8f0",
            soft: night ? "#132c40" : "#dcecfb",
            ink: night ? "#9fd0f7" : "#0b4a7a",
            label: "Sky",
            dark: false
        },
        PLUM: {
            fill: night ? "#b267cc" : "#8e3fa8",
            soft: night ? "#33203b" : "#efdff5",
            ink: night ? "#d9a8ea" : "#8e3fa8",
            label: "Plum",
            dark: true
        }
    }
}

export const HABIT_PALETTES: Record<Scheme, Record<HabitColor, HabitSwatch>> = {
    light: habitPalette(palettes.light, "light"),
    dark: habitPalette(palettes.dark, "dark")
}

/** The light palette, for the widgets (which pick their own dark colors). */
export const HABIT_PALETTE = HABIT_PALETTES.light

/** The habit palette for the scheme the app is showing. */
export function useHabitPalette(): Record<HabitColor, HabitSwatch> {
    return HABIT_PALETTES[useScheme()]
}

export const HABIT_COLORS = Object.keys(HABIT_PALETTE) as HabitColor[]
