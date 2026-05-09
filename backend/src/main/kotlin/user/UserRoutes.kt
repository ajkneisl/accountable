package user

import api.Error
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import java.util.UUID
import kotlinx.serialization.Serializable

/**
 * Response when retrieving yourself.
 *
 * @param userID The ID of the user.
 * @param username The user's username.
 * @param email The user's email.
 * @param createdAt When the user created their account.
 */
@Serializable
data class SelfResponse(
    val userID: String,
    val username: String,
    val email: String,
    val createdAt: Long,
)

/**
 * Response when retrieving another user.
 *
 * @param userID The ID of the user.
 * @param username The user's username.
 * @param createdAt When the user created their account.
 */
@Serializable data class UserResponse(val userID: String, val username: String, val createdAt: Long)

fun Route.userRoutes() {
    authenticate("jwt") {
        route("/user") {
            get {
                val principal = call.principal<JWTPrincipal>()!!
                val userID =
                    principal.subject?.let(UUID::fromString) ?: Error.text("invalid token")

                val user = findUserByID(userID) ?: Error.notFound("user")

                call.respond(
                    SelfResponse(
                        userID = user.id.toString(),
                        username = user.username,
                        email = user.email,
                        createdAt = user.createdAt,
                    )
                )
            }

            get("/{name}") {
                val name = call.parameters["name"] ?: Error.text("missing username")
                val user = findUserByUsername(name) ?: Error.notFound("user")
                call.respond(
                    UserResponse(
                        userID = user.id.toString(),
                        username = user.username,
                        createdAt = user.createdAt,
                    )
                )
            }
        }
    }
}
