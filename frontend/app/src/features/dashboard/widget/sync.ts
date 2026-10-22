// Widget sync is iOS-only (see sync.ios.ts). Everywhere else these are no-ops so
// callers don't need to branch on platform.

import type { Goal } from "@shared/index"

/** Push the latest goal progress to the home screen widget. */
export function syncGoalsWidget(_goals: Goal[]): void {}

/** Reset the widget to its signed-out state. */
export function clearGoalsWidget(): void {}
