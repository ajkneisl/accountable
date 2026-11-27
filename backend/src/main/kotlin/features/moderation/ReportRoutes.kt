package features.moderation

import api.Error
import io.ktor.http.HttpStatusCode
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import java.util.UUID

fun Route.reportRoutes() {
    authenticate("jwt") {
        // POST /api/users/{id}/report: { reason: AVATAR | USERNAME, details? }
        post("/users/{id}/report") {
            val userID = call.principal<JWTPrincipal>()!!.subject?.let(UUID::fromString)
                ?: Error.text("invalid token")
            val reportedID =
                call.parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                    ?: Error.notFound("user")

            val req = call.receive<ReportUserRequest>()
            reportUser(userID, reportedID, req.reason, req.details)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
