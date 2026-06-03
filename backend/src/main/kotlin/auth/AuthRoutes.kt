package auth

import io.ktor.http.HttpStatusCode
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingContext
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import kotlinx.serialization.Serializable

/**
 * A user payload for registering.
 *
 * @param username The requested username.
 * @param email The requested email.
 * @param password The requested password
 */
@Serializable
data class RegisterRequest(val username: String, val email: String, val password: String)

/**
 * POST /api/auth/register
 *
 * Register an account
 */
private val USER_REGISTER_ROUTE: suspend RoutingContext.() -> Unit = {
    val req = call.receive<RegisterRequest>()

    val tokens = Auth.register(req.username, req.email, req.password)

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
    }
}
