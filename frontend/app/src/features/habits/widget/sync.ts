// Widget sync is iOS-only (see sync.ios.ts). Everywhere else these are no-ops so
// callers don't need to branch on platform.

import type { HabitsResponse } from "@shared/index"

/** Push the latest habits to the home screen widget. */
export function syncHabitsWidget(_habits: HabitsResponse): void {}

/** Reset the widget to its signed-out state. */
export function clearHabitsWidget(): void {}
