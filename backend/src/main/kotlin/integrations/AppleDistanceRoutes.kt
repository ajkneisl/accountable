package integrations

import api.Cache
import api.Error
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

/** Most days accepted by a single import call, matching steps' limit. */
private const val MAX_IMPORT = 400

/** A sanity cap on one day's distance on foot — well past any real day, short of junk data. */
private const val MAX_METERS_PER_DAY = 300_000L

private const val DAY_MS = 24L * 60 * 60 * 1000

/** Request body for importing distance from Apple Health. */
@Serializable data class ImportDistanceRequest(val days: List<ImportedDistanceDay>)

/** How many days' totals the import changed. */
@Serializable data class ImportDistanceResponse(val imported: Int)

/**
 * POST /api/integrations/apple_distance/import — store per-day walking and running distance from
 * Apple Health, in metres. Idempotent: each posted day replaces that day's stored total.
 */
private val DISTANCE_IMPORT_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<ImportDistanceRequest>()
    if (req.days.size > MAX_IMPORT) Error.text("at most $MAX_IMPORT days per import")
    req.days.forEach {
        if (it.meters !in 0..MAX_METERS_PER_DAY) {
            Error.text("meters must be between 0 and $MAX_METERS_PER_DAY")
        }
        if (it.day > System.currentTimeMillis() + DAY_MS) Error.text("day must not be in the future")
    }
    val imported = importDistance(userID, req.days)
    if (imported > 0) {
        Cache.invalidateUser(userID)
        publishFeed(userID)
    }
    call.respond(ImportDistanceResponse(imported))
}

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

/** Mounted under /api/integrations alongside [appleStepsRoutes]. */
fun Route.appleDistanceRoutes() {
    post("/apple_distance/import", DISTANCE_IMPORT_ROUTE)
}
