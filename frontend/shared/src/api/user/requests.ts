import { request, type ApiConfig } from "../http"
import type { User } from "../model/user"
import type { TokenResponse } from "../auth/requests"

/**
 * A response to retrieving yourself.
 *
 * @param email The user's email.
 */
export interface SelfResponse extends User {
    email: string
    /** The user's IANA timezone id, used to bucket their data by local day. */
    timezone: string
}

/**
 * Get the current authorized user.
 *
 * @param config API
 */
export function getSelf(config: ApiConfig): Promise<SelfResponse> {
    return request(config, "GET", "/user", undefined, { auth: true })
}

/** The browser's IANA timezone id (e.g. "America/Chicago"), or "UTC" if unavailable. */
export function browserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    } catch {
        return "UTC"
    }
}

/** PUT /api/user/timezone — set the authenticated user's IANA timezone. */
export function updateTimezone(
    config: ApiConfig,
    timezone: string
): Promise<void> {
    return request(
        config,
        "PUT",
        "/user/timezone",
        { timezone },
        { auth: true, expectJson: false }
    )
}

/**
 * Ensure the backend has the user's current browser timezone, correcting accounts created before a
 * timezone was captured (the cause of data landing on the wrong day). PUTs only when [current]
 * differs from the browser zone. Best-effort: failures are swallowed so they never block bootstrap.
 */
export async function syncTimezone(
    config: ApiConfig,
    current: string | undefined
): Promise<void> {
    const tz = browserTimezone()
    if (current === tz) return
    try {
        await updateTimezone(config, tz)
    } catch {
        // Non-fatal: a failed sync just leaves the existing zone in place.
    }
}

/**
 * Get a user.
 *
 * @param config API
 * @param username The username of the user to retrieve.
 */
export function getUser(config: ApiConfig, username: string): Promise<User> {
    return request(
        config,
        "GET",
        `/user/${encodeURIComponent(username)}`,
        undefined,
        { auth: true }
    )
}

/**
 * PUT /api/user/password — change the authenticated user's password. Every other session is signed
 * out; the returned tokens replace this device's.
 */
export function changePassword(
    config: ApiConfig,
    currentPassword: string,
    newPassword: string
): Promise<TokenResponse> {
    return request(
        config,
        "PUT",
        "/user/password",
        { currentPassword, newPassword },
        { auth: true }
    )
}

/** PUT /api/user/email — change the authenticated user's email. */
export function changeEmail(
    config: ApiConfig,
    currentPassword: string,
    email: string
): Promise<void> {
    return request(
        config,
        "PUT",
        "/user/email",
        { currentPassword, email },
        { auth: true, expectJson: false }
    )
}

/** DELETE /api/user — permanently delete the authenticated user and all of their data. */
export function deleteAccount(
    config: ApiConfig,
    currentPassword: string
): Promise<void> {
    return request(
        config,
        "DELETE",
        "/user",
        { currentPassword },
        { auth: true, expectJson: false }
    )
}
