package integrations

import api.Error
import io.ktor.http.HttpStatusCode
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingContext
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import java.util.UUID
import kotlinx.serialization.Serializable

/** Minimum time between user-triggered refreshes for today's row. */
private const val REFRESH_COOLDOWN_MS = 15L * 60 * 1000

/**
 * Request body for enabling an integration.
 *
 * @param externalID The user's account name on the upstream provider (e.g. GitHub username).
 */
@Serializable data class EnableIntegrationRequest(val externalID: String)

/**
 * Response for [INTEGRATION_GET_ROUTE].
 *
 * @param data The provider-specific payload, polymorphically serialized.
 * @param lastFetched When [data] was last refreshed from upstream; only populated for today.
 */
@Serializable
data class IntegrationDayResponse(val data: IntegrationData, val lastFetched: Long? = null)

/**
 * POST /api/integrations/{name}
 *
 * Enable {name} for the authenticated user, linking the supplied upstream account. Re-posting
 * updates the externalID in place.
 */
private val INTEGRATION_ENABLE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val name = call.integrationName()

    val req = call.receive<EnableIntegrationRequest>()
    if (req.externalID.isBlank()) Error.text("externalID must not be blank")

    enableIntegration(userID, name, req.externalID)

    call.respond(HttpStatusCode.NoContent)
}

/**
 * GET /api/integrations/{name}?date={ms-epoch}
 *
 * Returns the integration's data for the UTC day containing `date`. If `date` is today, a stale
 * row (older than [REFRESH_COOLDOWN_MS]) or a missing row triggers an upstream refresh, and
 * `lastFetched` is included. Past days are served from storage only and omit `lastFetched`.
 */
private val INTEGRATION_GET_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val name = call.integrationName()
    val integration =
        Integrations.byName[name] ?: Error.notFound("integration")

    val dateMs =
        call.request.queryParameters["date"]?.toLongOrNull()
            ?: Error.text("missing or invalid 'date' query parameter")

    val target = startOfUtcDay(dateMs)
    val today = startOfUtcDay(System.currentTimeMillis())

    val (data, lastFetched) =
        when {
            target > today -> Error.text("date must not be in the future")
            target == today -> {
                val cached = integration.getDay(userID, target)
                val record =
                    if (
                        cached == null ||
                            System.currentTimeMillis() - cached.fetchedAt >= REFRESH_COOLDOWN_MS
                    ) {
                        integration.refresh(userID, target)
                    } else cached
                record.data to record.fetchedAt
            }
            else -> {
                val cached = integration.getDay(userID, target) ?: Error.notFound("data")
                cached.data to null
            }
        }

    call.respond(IntegrationDayResponse(data = data, lastFetched = lastFetched))
}

private fun io.ktor.server.application.ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

private fun io.ktor.server.application.ApplicationCall.integrationName(): String {
    val name = parameters["name"] ?: Error.text("missing integration name")
    if (name !in Integrations.byName) Error.notFound("integration")
    return name
}

fun Route.integrationRoutes() {
    authenticate("jwt") {
        route("/integrations") {
            post("/{name}", INTEGRATION_ENABLE_ROUTE)
            get("/{name}", INTEGRATION_GET_ROUTE)
        }
    }
}
