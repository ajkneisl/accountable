// Hands the goals timeline (see sync.native.ts) to the iOS widget.

import { isRunningInExpoGo } from "expo"
import type { GoalsWidgetProps } from "./GoalsWidget"

type Widget = typeof import("./GoalsWidget").default

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
                : (require("./GoalsWidget") as typeof import("./GoalsWidget"))
                      .default
        } catch {
            widget = null
        }
    }
    return widget
}

export function widgetAvailable(): boolean {
    return getWidget() !== null
}

export function updateWidget(
    entries: { date: Date; props: GoalsWidgetProps }[]
) {
    try {
        getWidget()?.updateTimeline(entries)
    } catch {
        // A widget refresh is best effort and must never break the app.
    }
}
