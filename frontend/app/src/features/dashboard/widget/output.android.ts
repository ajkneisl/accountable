// Hands the goals timeline (see sync.native.ts) to the Android widget.

import { redrawWidget } from "../../widgets/render.android"
import { saveTimeline } from "../../widgets/timeline.android"
import type { GoalsWidgetProps } from "./GoalsWidget"

export function widgetAvailable(): boolean {
    return true
}

export function updateWidget(
    entries: { date: Date; props: GoalsWidgetProps }[]
) {
    try {
        saveTimeline("GoalsProgress", entries)
        void redrawWidget("GoalsProgress")
    } catch {
        // A widget refresh is best effort and must never break the app.
    }
}
