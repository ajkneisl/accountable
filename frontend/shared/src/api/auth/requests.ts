import { request, type ApiConfig } from "../http"
import { browserTimezone } from "../user/requests"

/**
 * A token creation response, happens in response to a login, register, etc.y
 */
export interface TokenResponse {
    accessToken: string
    refreshToken: string
    accessTokenExpiresAt: number
    refreshTokenExpiresAt: number
}

/**
 * Request to login.
 *
 * @param config API
 * @param username The provided username.
 * @param password The provided password.
 */
export function login(
    config: ApiConfig,
    username: string,
    password: string
): Promise<TokenResponse> {
    return request(config, "POST", "/auth/login", {
        username,
        password
    })
}

/**
 * Request to register an account.
 *
 * @param config API
 * @param username The provided username.
 * @param password The provided password.
 * @param email The provided email.
 * @param timezone IANA timezone id for local-day bucketing; defaults to the browser's zone.
 */
export function register(
    config: ApiConfig,
    username: string,
    password: string,
    email: string,
    timezone: string = browserTimezone()
): Promise<TokenResponse> {
    return request(config, "POST", "/auth/register", {
        username,
        password,
        email,
        timezone
    })
}

/**
 * Refresh a token and receive a new access token.
 *
 * @param config API
 * @param refreshToken The token to refresh.
 */
export function refresh(
    config: ApiConfig,
    refreshToken: string
): Promise<TokenResponse> {
    return request(config, "POST", "/auth/refresh", { refreshToken })
}

/**
 * Logout and disable a refresh token.
 *
 * @param config API
 * @param refreshToken The token to disable.
 */
export function logout(config: ApiConfig, refreshToken: string): Promise<void> {
    return request(
        config,
        "POST",
        "/auth/logout",
        { refreshToken },
        { expectJson: false }
    )
}

/**
 * POST /api/auth/password/forgot — email a password reset link to the account
 * [identifier] names (a username or an email address). Resolves the same way
 * whether or not an account matched.
 */
export function requestPasswordReset(
    config: ApiConfig,
    identifier: string
): Promise<void> {
    return request(
        config,
        "POST",
        "/auth/password/forgot",
        { identifier },
        { expectJson: false }
    )
}

/**
 * POST /api/auth/password/reset — set a new password with the token from a
 * reset link. Signs the account out everywhere.
 */
export function resetPassword(
    config: ApiConfig,
    token: string,
    password: string
): Promise<void> {
    return request(
        config,
        "POST",
        "/auth/password/reset",
        { token, password },
        { expectJson: false }
    )
}

/**
 * POST /api/auth/display — the token for the signed-in user's billboard link.
 * It's the same on every call and doesn't expire; changing the password
 * revokes it.
 */
export function getDisplayToken(config: ApiConfig): Promise<{ token: string }> {
    return request(config, "POST", "/auth/display", undefined, { auth: true })
}

/** Read-only access for a billboard display. */
export interface DisplayAccessResponse {
    accessToken: string
    accessTokenExpiresAt: number
}

/**
 * POST /api/auth/display/access — trade a billboard link's token for a
 * short-lived access token that can only read. The link's token isn't used up.
 */
export function displayAccess(
    config: ApiConfig,
    token: string
): Promise<DisplayAccessResponse> {
    return request(config, "POST", "/auth/display/access", { token })
}
