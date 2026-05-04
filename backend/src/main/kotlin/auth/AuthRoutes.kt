package com.accountable.auth

import io.ktor.http.HttpStatusCode
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import kotlinx.serialization.Serializable

@Serializable
data class RegisterRequest(val username: String, val email: String, val password: String)

@Serializable
data class LoginRequest(val username: String, val password: String)

@Serializable
data class RefreshRequest(val refreshToken: String)

@Serializable
data class TokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val accessTokenExpiresAt: Long,
    val refreshTokenExpiresAt: Long,
)

@Serializable
data class MeResponse(val userId: String, val username: String)

fun Route.authRoutes() {
    route("/auth") {
        post("/register") {
            val req = call.receive<RegisterRequest>()
            val tokens = AuthService.register(req.username, req.email, req.password)
            call.respond(tokens.toResponse())
        }
        post("/login") {
            val req = call.receive<LoginRequest>()
            val tokens = AuthService.login(req.username, req.password)
            call.respond(tokens.toResponse())
        }
        post("/refresh") {
            val req = call.receive<RefreshRequest>()
            val tokens = AuthService.refresh(req.refreshToken)
            call.respond(tokens.toResponse())
        }
        post("/logout") {
            val req = call.receive<RefreshRequest>()
            AuthService.logout(req.refreshToken)
            call.respond(HttpStatusCode.NoContent)
        }
        authenticate("auth-jwt") {
            get("/me") {
                val principal = call.principal<JWTPrincipal>()!!
                call.respond(
                    MeResponse(
                        userId = principal.subject ?: "",
                        username = principal.payload.getClaim("username").asString() ?: "",
                    ),
                )
            }
        }
    }
}

private fun TokenPair.toResponse() =
    TokenResponse(accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt)
