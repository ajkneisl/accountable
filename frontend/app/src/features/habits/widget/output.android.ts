// Hands the habits timeline (see sync.native.ts) to the Android widget.

import { redrawWidget } from "../../widgets/render.android"
import { saveTimeline } from "../../widgets/timeline.android"
import type { HabitsWidgetProps } from "./HabitsWidget"

export function widgetAvailable(): boolean {
    return true
}

export function updateWidget(
    entries: { date: Date; props: HabitsWidgetProps }[]
) {
    try {
        saveTimeline("HabitsHeatmap", entries)
        void redrawWidget("HabitsHeatmap")
    } catch {
        // A widget refresh is best effort and must never break the app.
    }
}
