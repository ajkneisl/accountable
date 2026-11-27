import { request, type ApiConfig } from "../http"
import type { User } from "../model/user"
import type { TokenResponse } from "../auth/requests"
import type { HabitColor } from "../habits/requests"

/**
 * A response to retrieving yourself.
 *
 * @param email The user's email.
 */
export interface SelfResponse extends User {
    email: string
    /** The user's IANA timezone id, used to bucket their data by local day. */
    timezone: string
    /** The color that stands for them in competitions; a default until they pick one. */
    color: HabitColor
    /** Whether others see the specifics on their feed updates, or only totals. */
    feedDetails: boolean
    /** For their profile picture's URL ({@link avatarUrl}); absent if they have none. */
    avatarVersion?: number | null
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

/** PUT /api/user/feed-details — set whether others see the specifics on this user's feed updates. */
export function updateFeedDetails(
    config: ApiConfig,
    enabled: boolean
): Promise<void> {
    return request(
        config,
        "PUT",
        "/user/feed-details",
        { enabled },
        { auth: true, expectJson: false }
    )
}

/** PUT /api/user/color — set the color that stands for the authenticated user in competitions. */
export function updateColor(
    config: ApiConfig,
    color: HabitColor
): Promise<void> {
    return request(
        config,
        "PUT",
        "/user/color",
        { color },
        { auth: true, expectJson: false }
    )
}

/**
 * The URL of [userID]'s profile picture at [avatarVersion], or null if they
 * have none. The version changes with every upload, so the image can be cached
 * for good.
 */
export function avatarUrl(
    config: ApiConfig,
    userID: string,
    avatarVersion: number | null | undefined
): string | null {
    if (avatarVersion == null) return null
    const baseUrl = config.baseUrl.replace(/\/$/, "")
    return `${baseUrl}/avatars/${userID}?v=${avatarVersion}`
}

/**
 * A file part for {@link uploadAvatar} in the app. Expo's fetch reads a
 * FormData file through `bytes()`; React Native's `{ uri, name, type }` isn't
 * supported there and fails before anything is sent.
 */
export interface UploadFile {
    name: string
    type: string
    bytes(): Promise<Uint8Array>
}

/**
 * PUT /api/user/avatar — set the user's profile picture: a Blob on the web,
 * an {@link UploadFile} in the app. The server crops it square and shrinks it.
 */
export function uploadAvatar(
    config: ApiConfig,
    picture: Blob | UploadFile
): Promise<{ avatarVersion: number }> {
    const form = new FormData()
    form.append("picture", picture as Blob)
    return request(config, "PUT", "/user/avatar", form, { auth: true })
}

/** DELETE /api/user/avatar — remove the user's profile picture. */
export function removeAvatar(config: ApiConfig): Promise<void> {
    return request(config, "DELETE", "/user/avatar", undefined, {
        auth: true,
        expectJson: false
    })
}

/** What about a person is being reported. */
export type ReportReason = "AVATAR" | "USERNAME"

/**
 * POST /api/users/{userID}/report — report someone you share a competition
 * with for their profile picture or username. Reporting the same thing twice
 * is accepted but only filed once.
 */
export function reportUser(
    config: ApiConfig,
    userID: string,
    reason: ReportReason,
    details?: string
): Promise<void> {
    return request(
        config,
        "POST",
        `/users/${encodeURIComponent(userID)}/report`,
        { reason, details },
        { auth: true, expectJson: false }
    )
}
