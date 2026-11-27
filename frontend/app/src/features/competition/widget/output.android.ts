// Hands the standings timeline (see sync.native.ts) to the Android widget.

import { redrawWidget } from "../../widgets/render.android"
import { saveTimeline } from "../../widgets/timeline.android"
import type { CompetitionsWidgetProps } from "./CompetitionsWidget"

export function widgetAvailable(): boolean {
    return true
}

export function updateWidget(
    entries: { date: Date; props: CompetitionsWidgetProps }[]
) {
    try {
        saveTimeline("CompetitionStandings", entries)
        void redrawWidget("CompetitionStandings")
    } catch {
        // A widget refresh is best effort and must never break the app.
    }
}
