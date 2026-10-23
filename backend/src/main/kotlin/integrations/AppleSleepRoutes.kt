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

/** Most days accepted by a single import call — a generous backfill plus room for naps. */
private const val MAX_IMPORT = 400

/** A day can't hold more sleep than it has minutes. */
private const val MINUTES_PER_DAY = 24L * 60

/** Request body for importing sleep from Apple Health. */
@Serializable data class ImportSleepRequest(val days: List<ImportedSleepDay>)

/** How many days' totals the import changed. */
@Serializable data class ImportSleepResponse(val imported: Int)

/**
 * POST /api/integrations/apple_sleep/import — store per-day sleep totals from Apple Health.
 * Idempotent: each posted day replaces that day's stored total.
 */
private val SLEEP_IMPORT_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<ImportSleepRequest>()
    if (req.days.size > MAX_IMPORT) Error.text("at most $MAX_IMPORT days per import")
    req.days.forEach {
        if (it.minutes !in 0..MINUTES_PER_DAY) Error.text("minutes must be between 0 and 1440")
        if (it.endedAt > System.currentTimeMillis() + MINUTES_PER_DAY * 60_000) {
            Error.text("endedAt must not be in the future")
        }
    }
    val imported = importSleep(userID, req.days)
    if (imported > 0) Cache.invalidateUser(userID)
    call.respond(ImportSleepResponse(imported))
}

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

/** Mounted under /api/integrations alongside [appleFitnessRoutes]. */
fun Route.appleSleepRoutes() {
    post("/apple_sleep/import", SLEEP_IMPORT_ROUTE)
}
