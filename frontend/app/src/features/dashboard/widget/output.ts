// Where the goals timeline goes: the iOS or Android widget (output.ios.ts,
// output.android.ts). There's no widget elsewhere, and sync.ts is used there.

import type { GoalsWidgetProps } from "./GoalsWidget"

export function widgetAvailable(): boolean {
    return false
}

export function updateWidget(
    _entries: { date: Date; props: GoalsWidgetProps }[]
) {}
