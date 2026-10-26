import { request, type ApiConfig } from "../http"

/**
 * The scheduled notifications a user can switch off, sent at their local time:
 * - GOALS_STATUS: 5pm, how today's goals and habits stand
 * - STREAK_RISK: 9pm, a streak that ends at midnight unless today is finished
 * - COMPETITION_RECAP: Monday 9am, where they finished last week in each competition
 */
export type NotificationKind =
    | "GOALS_STATUS"
    | "STREAK_RISK"
    | "COMPETITION_RECAP"

export interface NotificationSettings {
    /** Whether each kind is on; every kind is present in a response. */
    enabled: Record<NotificationKind, boolean>
}

/**
 * PUT /api/notifications/devices — start pushing to this device. [sandbox]
 * hints that it's a development build; the server corrects a wrong guess.
 */
export function registerPushDevice(
    config: ApiConfig,
    token: string,
    sandbox: boolean
): Promise<void> {
    return request(
        config,
        "PUT",
        "/notifications/devices",
        { token, sandbox },
        { auth: true, expectJson: false }
    )
}

/**
 * DELETE /api/notifications/devices/{token} — stop pushing to this device.
 * Needs no session, so it works after the server has already ended one.
 */
export function unregisterPushDevice(
    config: ApiConfig,
    token: string
): Promise<void> {
    return request(
        config,
        "DELETE",
        `/notifications/devices/${encodeURIComponent(token)}`,
        undefined,
        { expectJson: false }
    )
}

/** GET /api/notifications/settings — which notifications are on. */
export function getNotificationSettings(
    config: ApiConfig
): Promise<NotificationSettings> {
    return request(config, "GET", "/notifications/settings", undefined, {
        auth: true
    })
}

/** PUT /api/notifications/settings — switch kinds on or off; omitted kinds are left alone. */
export function updateNotificationSettings(
    config: ApiConfig,
    enabled: Partial<Record<NotificationKind, boolean>>
): Promise<NotificationSettings> {
    return request(
        config,
        "PUT",
        "/notifications/settings",
        { enabled },
        { auth: true }
    )
}
