import { request, type ApiConfig } from "../http"

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
 */
export function register(
    config: ApiConfig,
    username: string,
    password: string,
    email: string
): Promise<TokenResponse> {
    return request(config, "POST", "/auth/register", {
        username,
        password,
        email
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
