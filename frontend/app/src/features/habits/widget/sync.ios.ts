// Feeds the HabitsHeatmap widget. The widget can't fetch or compute anything
// itself, so this flattens the API response into ready-to-paint levels and hands
// it over as a snapshot, which WidgetKit keeps until the next one.

import { isRunningInExpoGo } from "expo"
import type { HabitsResponse } from "@shared/index"
import { buildGrid, HABIT_PALETTE } from "../grid"
import type { HabitsWidgetProps } from "./HabitsWidget"

/** Week columns the widget can draw at most (the medium/large width). */
const WIDGET_WEEKS = 20

/** Days in each habit's strip on the large widget. */
const RECENT_DAYS = 14

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

function update(props: HabitsWidgetProps) {
    try {
        getWidget()?.updateSnapshot(props)
    } catch {
        // A widget refresh is best effort and must never break the app.
    }
}

export function syncHabitsWidget({
    start,
    today,
    habits
}: HabitsResponse): void {
    const last = habits[0]?.done.length ?? 0

    const weeks = buildGrid(start, today, WIDGET_WEEKS).map((week) =>
        week.map((cell) => {
            if (cell.future) return -1
            if (cell.index < 0 || habits.length === 0) return 0
            const done = habits.filter((h) => h.done[cell.index]).length
            return done === 0 ? 0 : Math.ceil((done / habits.length) * 4)
        })
    )

    update({
        weeks,
        doneToday: habits.filter((h) => h.done[last - 1]).length,
        habitCount: habits.length,
        rows: habits.map((h) => ({
            name: h.name,
            color: HABIT_PALETTE[h.color].fill,
            streak: h.streak,
            recent: h.done.slice(-RECENT_DAYS).map((d) => (d ? 1 : 0))
        })),
        signedOut: false
    })
}

export function clearHabitsWidget(): void {
    update({
        weeks: [],
        doneToday: 0,
        habitCount: 0,
        rows: [],
        signedOut: true
    })
}
