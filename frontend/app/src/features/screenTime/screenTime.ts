// Screen Time exists only on iOS (see screenTime.ios.ts). Elsewhere it's
// reported as unsupported and every action is a no-op.

import type { ApiConfig } from "@shared/index"

export function isScreenTimeSupported(): boolean {
    return false
}

/** Whether access is granted, apps are picked, and the daily monitor is running. */
export function isScreenTimeConnected(): boolean {
    return false
}

/** Ask for Screen Time access, pick what to track, and start monitoring. */
export async function connectScreenTime(): Promise<boolean> {
    return false
}

/** Re-open the app picker and restart monitoring with the new choice. */
export async function chooseScreenTimeApps(): Promise<boolean> {
    return false
}

/** Restart the monitor if an older build started it with different events. */
export function ensureScreenTimeMonitoring(): void {}

export interface ScreenTimeStatus {
    /** Minutes recorded today, or null if today has no total yet. */
    todayMinutes: number | null
    /** Ms epoch the monitor extension last reported, or null if it never has. */
    lastEventAt: number | null
}

/** What the phone has recorded so far. */
export function screenTimeStatus(): ScreenTimeStatus {
    return { todayMinutes: null, lastEventAt: null }
}

/** Stop monitoring and forget the picked apps and recorded days. */
export function forgetScreenTime(): void {}

/** Post every recorded day. Resolves to how many days changed. */
export async function syncScreenTime(_api: ApiConfig): Promise<number> {
    return 0
}
