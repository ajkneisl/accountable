import { request, type ApiConfig } from "../http"

export type DayStatus = "ON" | "MISS" | "TODAY" | "NONE"

export interface StreakResponse {
    streak: number
}

export interface StreakHistoryResponse {
    /** Per-day status for the last N UTC days, oldest first. The final entry is today. */
    days: DayStatus[]
}

/** GET /api/streak — the user's current streak. */
export function getStreak(config: ApiConfig): Promise<StreakResponse> {
    return request(config, "GET", "/streak", undefined, { auth: true })
}

/** GET /api/streak/recent — per-day status for the last [days] days (default 14). */
export function getStreakHistory(
    config: ApiConfig,
    days?: number
): Promise<StreakHistoryResponse> {
    const path = days ? `/streak/recent?days=${days}` : "/streak/recent"
    return request(config, "GET", path, undefined, { auth: true })
}
