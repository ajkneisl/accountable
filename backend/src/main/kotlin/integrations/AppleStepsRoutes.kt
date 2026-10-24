package integrations

import api.Cache
import api.Error
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

/** A sanity cap on one day's steps — well past any real day, short of junk data. */
private const val MAX_STEPS_PER_DAY = 250_000L

private const val DAY_MS = 24L * 60 * 60 * 1000

/** Request body for importing steps from Apple Health. */
@Serializable data class ImportStepsRequest(val days: List<ImportedStepsDay>)

/** How many days' totals the import changed. */
@Serializable data class ImportStepsResponse(val imported: Int)

/**
 * POST /api/integrations/apple_steps/import — store per-day step totals from Apple Health.
 * Idempotent: each posted day replaces that day's stored total.
 */
private val STEPS_IMPORT_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<ImportStepsRequest>()
    if (req.days.size > MAX_IMPORT) Error.text("at most $MAX_IMPORT days per import")
    req.days.forEach {
        if (it.steps !in 0..MAX_STEPS_PER_DAY) {
            Error.text("steps must be between 0 and $MAX_STEPS_PER_DAY")
        }
        if (it.day > System.currentTimeMillis() + DAY_MS) Error.text("day must not be in the future")
    }
    val imported = importSteps(userID, req.days)
    if (imported > 0) Cache.invalidateUser(userID)
    call.respond(ImportStepsResponse(imported))
}

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

/** Mounted under /api/integrations alongside [appleSleepRoutes]. */
fun Route.appleStepsRoutes() {
    post("/apple_steps/import", STEPS_IMPORT_ROUTE)
}
