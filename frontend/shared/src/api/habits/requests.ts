import { request, type ApiConfig } from "../http"

export type HabitColor = "LIME" | "CORAL" | "INDIGO" | "INK"

/** One habit with its heatmap window. */
export interface Habit {
    id: string
    name: string
    color: HabitColor
    createdAt: number
    /**
     * Whether the habit was done on each day of the window, oldest first; the
     * last entry is today. Aligned with {@link HabitsResponse.start}.
     */
    done: boolean[]
    /** Consecutive days done, ending today (or yesterday if today isn't checked yet). */
    streak: number
    /** Days done within the window. */
    total: number
}

/** Every habit over a shared window, so all heatmaps line up column for column. */
export interface HabitsResponse {
    /** First day of the window, `yyyy-MM-dd` in the user's timezone. */
    start: string
    /** Last day of the window (today), `yyyy-MM-dd` in the user's timezone. */
    today: string
    habits: Habit[]
}

export interface CreateHabitRequest {
    name: string
    color: HabitColor
}

/** Fields to change on a habit; omitted ones are left as they are. */
export interface UpdateHabitRequest {
    name?: string
    color?: HabitColor
}

const windowQuery = (days?: number) => (days ? `?days=${days}` : "")

/** GET /api/habits?days=N — the user's habits with an N-day window (default 126). */
export function listHabits(
    config: ApiConfig,
    days?: number
): Promise<HabitsResponse> {
    return request(config, "GET", `/habits${windowQuery(days)}`, undefined, {
        auth: true
    })
}

/** POST /api/habits — create a habit; resolves to the refreshed list. */
export function createHabit(
    config: ApiConfig,
    body: CreateHabitRequest,
    days?: number
): Promise<HabitsResponse> {
    return request(config, "POST", `/habits${windowQuery(days)}`, body, {
        auth: true
    })
}

/** PATCH /api/habits/{id} — rename and/or recolor a habit; resolves to the refreshed list. */
export function updateHabit(
    config: ApiConfig,
    id: string,
    body: UpdateHabitRequest,
    days?: number
): Promise<HabitsResponse> {
    return request(
        config,
        "PATCH",
        `/habits/${encodeURIComponent(id)}${windowQuery(days)}`,
        body,
        { auth: true }
    )
}

/** DELETE /api/habits/{id} — remove a habit and its history. */
export function deleteHabit(config: ApiConfig, id: string): Promise<void> {
    return request(
        config,
        "DELETE",
        `/habits/${encodeURIComponent(id)}`,
        undefined,
        { auth: true, expectJson: false }
    )
}

/**
 * PUT / DELETE /api/habits/{id}/checkins/{date} — mark a habit done (or not)
 * on `date` (`yyyy-MM-dd`); resolves to the refreshed list.
 */
export function setHabitCheckin(
    config: ApiConfig,
    id: string,
    date: string,
    done: boolean,
    days?: number
): Promise<HabitsResponse> {
    return request(
        config,
        done ? "PUT" : "DELETE",
        `/habits/${encodeURIComponent(id)}/checkins/${date}${windowQuery(days)}`,
        undefined,
        { auth: true }
    )
}
