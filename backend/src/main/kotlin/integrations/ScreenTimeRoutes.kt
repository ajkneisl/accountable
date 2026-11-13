package integrations

import api.Cache
import api.Error
import auth.JwtConfig
import features.feed.publishFeed
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingContext
import io.ktor.server.routing.post
import java.util.UUID
import kotlinx.serialization.Serializable

/** Most days accepted by a single import call, matching sleep's limit. */
private const val MAX_IMPORT = 400

/** A day can't hold more screen time than it has minutes. */
private const val MINUTES_PER_DAY = 24L * 60

private const val DAY_MS = MINUTES_PER_DAY * 60_000

/** Request body for importing screen time from the iOS DeviceActivity monitor. */
@Serializable data class ImportScreenTimeRequest(val days: List<ImportedScreenTimeDay>)

/** How many days' totals the import changed. */
@Serializable data class ImportScreenTimeResponse(val imported: Int)

/**
 * POST /api/integrations/screen_time/import — store per-day screen time totals from the phone.
 * Idempotent: a past day keeps the larger of its stored and posted totals; today takes the posted one.
 */
private val SCREEN_TIME_IMPORT_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<ImportScreenTimeRequest>()
    if (req.days.size > MAX_IMPORT) Error.text("at most $MAX_IMPORT days per import")
    req.days.forEach {
        if (it.minutes !in 0..MINUTES_PER_DAY) Error.text("minutes must be between 0 and 1440")
        if (it.day > System.currentTimeMillis() + DAY_MS) Error.text("day must not be in the future")
    }
    val imported = importScreenTime(userID, req.days)
    if (imported > 0) {
        Cache.invalidateUser(userID)
        publishFeed(userID)
    }
    call.respond(ImportScreenTimeResponse(imported))
}

/**
 * @param token Accepted only for importing screen time.
 * @param expiresAt Ms epoch the token stops working.
 */
@Serializable data class ScreenTimeTokenResponse(val token: String, val expiresAt: Long)

/**
 * POST /api/integrations/screen_time/token — a long-lived token that can only import screen time,
 * for the phone's Screen Time extension, which posts totals on its own but can't sign in. Needs a
 * normal session; the token itself can't mint another.
 */
private val SCREEN_TIME_TOKEN_ROUTE: suspend RoutingContext.() -> Unit = {
    val principal = call.principal<JWTPrincipal>()!!
    val username = principal.payload.getClaim("username").asString() ?: Error.text("invalid token")
    call.respond(
        ScreenTimeTokenResponse(
            token = JwtConfig.issueScreenTimeToken(call.userID(), username),
            expiresAt = System.currentTimeMillis() + JwtConfig.SCREEN_TIME_TOKEN_TTL_MS,
        )
    )
}

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

/** Mounted under /api/integrations alongside [appleStepsRoutes]. */
fun Route.screenTimeRoutes() {
    post("/screen_time/import", SCREEN_TIME_IMPORT_ROUTE)
    post("/screen_time/token", SCREEN_TIME_TOKEN_ROUTE)
}
