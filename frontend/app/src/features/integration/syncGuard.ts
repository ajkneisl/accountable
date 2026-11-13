// An in-flight marker for the device syncs that can't wedge. A plain "syncing"
// flag does: iOS suspends the app partway through a background sync, the flag
// stays set, and the next wake's sync is skipped because one is "still
// running". So a sync is marked by when it started, and one that has run past
// ABANDONED_MS no longer counts.

/**
 * Longer than iOS keeps the app awake for a background wake, so a sync this
 * old was cut off by a suspension rather than being slow.
 */
const ABANDONED_MS = 60_000

/** Whether a sync that started at [startedAt] (ms epoch, or null for none) is still running. */
export function isSyncRunning(startedAt: number | null): boolean {
    return startedAt !== null && Date.now() - startedAt < ABANDONED_MS
}
