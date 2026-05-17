import { request, type ApiConfig } from "../http"
import type { User } from "../model/user"

/**
 * A response to retrieving yourself.
 *
 * @param email The user's email.
 */
export interface SelfResponse extends User {
    email: string
}

/**
 * Get the current authorized user.
 *
 * @param config API
 */
export function getSelf(config: ApiConfig): Promise<SelfResponse> {
    return request(config, "GET", "/user", undefined, { auth: true })
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
