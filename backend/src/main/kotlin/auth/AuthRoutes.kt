package auth

import api.Error
import io.ktor.http.HttpStatusCode
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingContext
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import java.util.UUID
import kotlinx.serialization.Serializable

/**
 * A user payload for registering.
 *
 * @param username The requested username.
 * @param email The requested email.
 * @param password The requested password
 * @param timezone The client's IANA timezone id (e.g. "America/Chicago"); defaults to UTC.
 */
@Serializable
data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String,
    val timezone: String? = null,
)

/**
 * POST /api/auth/register
 *
 * Register an account
 */
private val USER_REGISTER_ROUTE: suspend RoutingContext.() -> Unit = {
    val req = call.receive<RegisterRequest>()

    val tokens = Auth.register(req.username, req.email, req.password, req.timezone ?: "UTC")

    call.respond(tokens)
}

/**
 * A user payload for logging in.
 *
 * @param username The provided username.
 * @param password The provided password.
 */
@Serializable data class LoginRequest(val username: String, val password: String)

/**
 * POST /api/auth/login
 *
 * Login to an account
 */
private val USER_LOGIN_ROUTE: suspend RoutingContext.() -> Unit = {
    val req = call.receive<LoginRequest>()

    val tokens = Auth.login(req.username, req.password)

    call.respond(tokens)
}

/**
 * A user payload for requesting a refresh token.
 *
 * @param refreshToken The token used to create an access token.
 */
@Serializable data class RefreshRequest(val refreshToken: String)

/**
 * POST /api/auth/refresh
 *
 * Refresh a token.
 */
private val USER_REFRESH_ROUTE: suspend RoutingContext.() -> Unit = {
    val req = call.receive<RefreshRequest>()

    val tokens = Auth.refresh(req.refreshToken)

    call.respond(tokens)
}

/**
 * POST /api/auth/logout
 *
 * Logout.
 */
private val USER_LOGOUT_ROUTE: suspend RoutingContext.() -> Unit = {
    val req = call.receive<RefreshRequest>()

    Auth.logout(req.refreshToken)

    call.respond(HttpStatusCode.NoContent)
}

/**
 * POST /api/auth/display
 *
 * The signed-in user's billboard link token, created on first use.
 */
private val DISPLAY_TOKEN_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID =
        call.principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")
    call.respond(DisplayTokenResponse(Auth.displayToken(userID)))
}

/** @param token The token from a billboard link. */
@Serializable data class DisplayAccessRequest(val token: String)

/**
 * POST /api/auth/display/access
 *
 * Trade a billboard link's token for read-only access.
 */
private val DISPLAY_ACCESS_ROUTE: suspend RoutingContext.() -> Unit = {
    val req = call.receive<DisplayAccessRequest>()
    call.respond(Auth.displayAccess(req.token))
}

/** @param identifier The account's username, or its email address. */
@Serializable data class ForgotPasswordRequest(val identifier: String)

/**
 * POST /api/auth/password/forgot
 *
 * Email a password reset link. Always 204, whether or not an account matched.
 */
private val FORGOT_PASSWORD_ROUTE: suspend RoutingContext.() -> Unit = {
    val req = call.receive<ForgotPasswordRequest>()
    PasswordReset.request(req.identifier)
    call.respond(HttpStatusCode.NoContent)
}

/**
 * @param token The token from the reset link.
 * @param password The new password.
 */
@Serializable data class ResetPasswordRequest(val token: String, val password: String)

/**
 * POST /api/auth/password/reset
 *
 * Set a new password with a reset link's token, signing out every session.
 */
private val RESET_PASSWORD_ROUTE: suspend RoutingContext.() -> Unit = {
    val req = call.receive<ResetPasswordRequest>()
    PasswordReset.reset(req.token, req.password)
    call.respond(HttpStatusCode.NoContent)
}

fun Route.authRoutes() {
    route("/auth") {
        // POST /api/auth/register
        post("/register", USER_REGISTER_ROUTE)

        // POST /api/auth/register
        post("/login", USER_LOGIN_ROUTE)

        // POST /api/auth/refresh
        post("/refresh", USER_REFRESH_ROUTE)

        // POST /api/auht/logout
        post("/logout", USER_LOGOUT_ROUTE)

        // POST /api/auth/display
        authenticate("jwt") { post("/display", DISPLAY_TOKEN_ROUTE) }

        // POST /api/auth/display/access
        post("/display/access", DISPLAY_ACCESS_ROUTE)

        // POST /api/auth/password/forgot
        post("/password/forgot", FORGOT_PASSWORD_ROUTE)

        // POST /api/auth/password/reset
        post("/password/reset", RESET_PASSWORD_ROUTE)
    }
}
