// Widget sync is iOS-only (see sync.ios.ts). Everywhere else these are no-ops so
// callers don't need to branch on platform.

import type { ApiConfig, CompetitionSummary } from "@shared/index"

/** Push the latest competition standings to the home screen widget. */
export async function syncCompetitionsWidget(
    _api: ApiConfig,
    _competitions: CompetitionSummary[],
    _meID: string | undefined
): Promise<void> {}

/** Reset the widget to its signed-out state. */
export function clearCompetitionsWidget(): void {}
