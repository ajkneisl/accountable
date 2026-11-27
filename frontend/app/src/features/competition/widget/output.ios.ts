// Hands the standings timeline (see sync.native.ts) to the iOS widget.

import { isRunningInExpoGo } from "expo"
import type { CompetitionsWidgetProps } from "./CompetitionsWidget"

type Widget = typeof import("./CompetitionsWidget").default

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
                : (
                      require("./CompetitionsWidget") as typeof import("./CompetitionsWidget")
                  ).default
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
    entries: { date: Date; props: CompetitionsWidgetProps }[]
) {
    try {
        getWidget()?.updateTimeline(entries)
    } catch {
        // A widget refresh is best effort and must never break the app.
    }
}
