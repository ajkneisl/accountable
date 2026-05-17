/**
 * A user.
 *
 * @param userID The unique UUID of the user.
 * @param username The user's unique username
 * @param createdAt The ms epoch of when the user was created.
 */
export interface User {
    userID: string
    username: string
    createdAt: number
}
