// Feeds the HabitsHeatmap widget. The widget can't fetch or compute anything
// itself, so this flattens the API response into ready-to-paint cells and hands
// it over as a timeline: the current state now, plus the same data rolled
// forward to each of the next few midnights (nothing checked in on the new
// days). That way the widget moves on to a new day by itself, even if the app
// isn't opened, until the next sync replaces the timeline.

import { isRunningInExpoGo } from "expo"
import type { HabitsResponse } from "@shared/index"
import { buildGrid, HABIT_PALETTE } from "../grid"
import type { HabitsWidgetProps } from "./HabitsWidget"

/** Week columns the widget draws at most (one medium/large card). */
const WIDGET_WEEKS = 9

/** Midnights to precompute, so a week without opening the app stays correct. */
const ROLLOVER_DAYS = 7

const DAY_MS = 86_400_000

type Widget = typeof import("./HabitsWidget").default

let widget: Widget | null | undefined

/**
 * The widget handle, or null where the native module doesn't exist. Expo Go
 * doesn't ship expo-widgets, and creating the widget there throws, so the module
 * is only loaded on demand in a development or release build.
 */
function getWidget(): Widget | null {
    if (widget === undefined) {
        try {
            widget = isRunningInExpoGo()
                ? null
                : (require("./HabitsWidget") as typeof import("./HabitsWidget"))
                      .default
        } catch {
            widget = null
        }
    }
    return widget
}

function update(entries: { date: Date; props: HabitsWidgetProps }[]) {
    try {
        getWidget()?.updateTimeline(entries)
    } catch {
        // A widget refresh is best effort and must never break the app.
    }
}

/** `yyyy-MM-dd` [days] after [date]. */
function addDays(date: string, days: number): string {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS)
        .toISOString()
        .slice(0, 10)
}

/** Widget props for [res] as it will look [ahead] days from now, if nothing else is checked in. */
function propsFor(res: HabitsResponse, ahead: number): HabitsWidgetProps {
    const today = addDays(res.today, ahead)
    const habits = res.habits.map((h) => ({
        ...h,
        // A streak survives one unchecked midnight only if today was done.
        streak:
            ahead === 0 || (ahead === 1 && h.done[h.done.length - 1])
                ? h.streak
                : 0,
        done: [...h.done, ...Array<boolean>(ahead).fill(false)]
    }))
    const grid = buildGrid(res.start, today, WIDGET_WEEKS)

    return {
        habits: habits.map((h) => ({
            id: h.id,
            name: h.name,
            color: HABIT_PALETTE[h.color].fill,
            streak: h.streak,
            doneToday: h.done[h.done.length - 1] ?? false,
            weeks: grid.map((week) =>
                week.map((cell) =>
                    cell.future
                        ? -1
                        : cell.index >= 0 && h.done[cell.index]
                          ? 1
                          : 0
                )
            )
        })),
        doneToday: habits.filter((h) => h.done[h.done.length - 1]).length,
        habitCount: habits.length,
        signedOut: false
    }
}

export function syncHabitsWidget(res: HabitsResponse): void {
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    update(
        Array.from({ length: ROLLOVER_DAYS + 1 }, (_, ahead) => ({
            date:
                ahead === 0
                    ? now
                    : new Date(
                          midnight.getFullYear(),
                          midnight.getMonth(),
                          midnight.getDate() + ahead
                      ),
            props: propsFor(res, ahead)
        }))
    )
}

export function clearHabitsWidget(): void {
    update([
        {
            date: new Date(),
            props: {
                habits: [],
                doneToday: 0,
                habitCount: 0,
                signedOut: true
            }
        }
    ])
}
