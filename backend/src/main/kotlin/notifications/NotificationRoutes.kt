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
private val APNS_TOKEN_PATTERN = Regex("^[0-9a-fA-F]{32,200}$")

/**
 * FCM registration tokens are opaque: today about 160 characters of letters, digits, `:`, `-` and
 * `_`. Google doesn't promise a length, so allow up to the column's width.
 */
private val FCM_TOKEN_PATTERN = Regex("^[A-Za-z0-9:_-]{32,512}$")

/**
 * [token] as stored, or null if it can't be a token of [platform]. APNs tokens are hex, so they're
 * stored lowercase whatever case the app sent; FCM tokens are case-sensitive and kept as issued.
 */
internal fun normalizeToken(token: String, platform: PushPlatform): String? =
    when (platform) {
        PushPlatform.IOS -> token.takeIf { APNS_TOKEN_PATTERN.matches(it) }?.lowercase()
        PushPlatform.ANDROID -> token.takeIf { FCM_TOKEN_PATTERN.matches(it) }
    }

/**
 * Request body for registering a device.
 *
 * @param token The device's push token: hex for APNs, as issued for FCM.
 * @param sandbox Whether the app is a development build. Only a hint: a token sent to the wrong
 *   environment is retried in the other and remembered. iOS only.
 * @param platform The service [token] belongs to. Builds from before Android don't send it.
 */
@Serializable
data class RegisterDeviceRequest(
    val token: String,
    val sandbox: Boolean = false,
    val platform: PushPlatform = PushPlatform.IOS,
)

/** Whether each [NotificationKind] is on. Every kind is present in a response. */
@Serializable data class NotificationSettings(val enabled: Map<NotificationKind, Boolean>)

/** PUT /api/notifications/devices — start pushing to this device for the authenticated user. */
private val DEVICE_REGISTER_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<RegisterDeviceRequest>()
    val token = normalizeToken(req.token, req.platform) ?: Error.text("invalid device token")
    registerDevice(userID, token, req.sandbox, req.platform)
    call.respond(HttpStatusCode.NoContent)
}

/**
 * DELETE /api/notifications/devices/{token} — stop pushing to this device, e.g. on sign-out.
 * Unauthenticated, since a session the server has already ended still has to stop its pushes; the
 * token is the secret, like an unsubscribe link.
 */
private val DEVICE_UNREGISTER_ROUTE: suspend RoutingContext.() -> Unit = {
    val token = call.parameters["token"] ?: Error.text("missing token")
    // Hex is an APNs token, stored lowercase; anything else is an FCM token, stored as issued.
    deleteDevice(normalizeToken(token, PushPlatform.IOS) ?: token)
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
