package notifications

import api.Error
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingContext
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import java.util.UUID
import kotlinx.serialization.Serializable

/** APNs device tokens are 32 bytes, hex-encoded; allow for Apple lengthening them. */
private val TOKEN_PATTERN = Regex("^[0-9a-fA-F]{32,200}$")

/**
 * Request body for registering a device.
 *
 * @param token The hex APNs device token.
 * @param sandbox Whether the app is a development build. Only a hint: a token sent to the wrong
 *   environment is retried in the other and remembered.
 */
@Serializable data class RegisterDeviceRequest(val token: String, val sandbox: Boolean = false)

/** Whether each [NotificationKind] is on. Every kind is present in a response. */
@Serializable data class NotificationSettings(val enabled: Map<NotificationKind, Boolean>)

/** PUT /api/notifications/devices — start pushing to this device for the authenticated user. */
private val DEVICE_REGISTER_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<RegisterDeviceRequest>()
    if (!TOKEN_PATTERN.matches(req.token)) Error.text("invalid device token")
    registerDevice(userID, req.token.lowercase(), req.sandbox)
    call.respond(HttpStatusCode.NoContent)
}

/**
 * DELETE /api/notifications/devices/{token} — stop pushing to this device, e.g. on sign-out.
 * Unauthenticated, since a session the server has already ended still has to stop its pushes; the
 * token is the secret, like an unsubscribe link.
 */
private val DEVICE_UNREGISTER_ROUTE: suspend RoutingContext.() -> Unit = {
    val token = call.parameters["token"] ?: Error.text("missing token")
    deleteDevice(token.lowercase())
    call.respond(HttpStatusCode.NoContent)
}

/** GET /api/notifications/settings — which notifications are on. */
private val SETTINGS_GET_ROUTE: suspend RoutingContext.() -> Unit = {
    call.respond(settingsFor(call.userID()))
}

/** PUT /api/notifications/settings — switch kinds on or off; omitted kinds are left alone. */
private val SETTINGS_UPDATE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<NotificationSettings>()
    setEnabled(userID, req.enabled)
    call.respond(settingsFor(userID))
}

private suspend fun settingsFor(userID: UUID): NotificationSettings {
    val off = optOutsFor(userID)
    return NotificationSettings(NotificationKind.entries.associateWith { it !in off })
}

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

fun Route.notificationRoutes() {
    route("/notifications") {
        delete("/devices/{token}", DEVICE_UNREGISTER_ROUTE)
        authenticate("jwt") {
            put("/devices", DEVICE_REGISTER_ROUTE)
            get("/settings", SETTINGS_GET_ROUTE)
            put("/settings", SETTINGS_UPDATE_ROUTE)
        }
    }
}
