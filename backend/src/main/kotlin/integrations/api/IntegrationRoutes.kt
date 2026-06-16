package integrations.api

import api.Error
import integrations.IntegrationData
import integrations.appleFitnessRoutes
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
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import java.util.UUID
import kotlinx.serialization.Serializable
import user.zoneOf

/** Minimum time between user-triggered refreshes for today's row. */
private const val REFRESH_COOLDOWN_MS = 15L * 60 * 1000

private const val DAY_MS = 24L * 60 * 60 * 1000

/** Default and maximum number of days returned by [INTEGRATION_HISTORY_ROUTE]. */
private const val DEFAULT_HISTORY_DAYS = 14
private const val MAX_HISTORY_DAYS = 90

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
 * One entry in [INTEGRATION_LIST_ROUTE].
 *
 * @param name Stable integration name (matches [Integration.name]).
 * @param enabled Whether the authenticated user has linked an upstream account.
 * @param externalID Linked upstream account identifier; `null` when [enabled] is false.
 * @param lastFetched When this integration was last refreshed from upstream (ms epoch); `null` when
 *   not enabled or no data has been fetched yet.
 */
@Serializable
data class IntegrationStatus(
    val name: String,
    val enabled: Boolean,
    val externalID: String? = null,
    val lastFetched: Long? = null,
)

/**
 * GET /api/integrations
 *
 * List every integration the server supports, with whether the authenticated user has linked it
 * and the upstream identifier they linked.
 */
private val INTEGRATION_LIST_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val links = integrationLinksFor(userID)
    val statuses =
        Integrations.all.map { integration ->
            val external = links[integration.name]
            IntegrationStatus(
                name = integration.name,
                enabled = external != null,
                externalID = external,
                lastFetched =
                    if (external != null) latestFetchedAt(userID, integration.table) else null,
            )
        }
    call.respond(statuses)
}

/**
 * DELETE /api/integrations/{name}
 *
 * Disconnect the authenticated user from {name}. Leaves previously fetched per-day rows in place.
 */
private val INTEGRATION_DISABLE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val name = call.integrationName()
    disableIntegration(userID, name)
    call.respond(HttpStatusCode.NoContent)
}

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
 * GET /api/integrations/{name}?date={ms-epoch}&force={bool}
 *
 * Returns the integration's data for the calendar day (in the user's timezone) containing `date`.
 * If `date` is today, a stale row (older than [REFRESH_COOLDOWN_MS]) or a missing row triggers
 * an upstream refresh, and `lastFetched` is included. Pass `force=true` to refresh today
 * regardless of the cooldown (used by the on-login refresh). Past days are served from storage
 * only and omit `lastFetched`.
 */
private val INTEGRATION_GET_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val name = call.integrationName()
    val integration =
        Integrations.byName[name] ?: Error.notFound("integration")

    val dateMs =
        call.request.queryParameters["date"]?.toLongOrNull()
            ?: Error.text("missing or invalid 'date' query parameter")
    val force = call.request.queryParameters["force"].toBoolean()

    val zone = zoneOf(userID)
    val target = startOfDay(dateMs, zone)
    val today = startOfDay(System.currentTimeMillis(), zone)

    val (data, lastFetched) =
        when {
            target > today -> Error.text("date must not be in the future")
            target == today -> {
                val cached = integration.getDay(userID, target)
                val record =
                    if (
                        force ||
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

/**
 * GET /api/integrations/{name}/history?days={n}
 *
 * Returns the integration's stored per-day data for the last `days` calendar days (default
 * [DEFAULT_HISTORY_DAYS], capped at [MAX_HISTORY_DAYS]), most-recent day first. Reads from storage
 * only — it does not trigger an upstream refresh.
 */
private val INTEGRATION_HISTORY_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val name = call.integrationName()
    val integration = Integrations.byName[name] ?: Error.notFound("integration")

    val days =
        (call.request.queryParameters["days"]?.toIntOrNull() ?: DEFAULT_HISTORY_DAYS)
            .coerceIn(1, MAX_HISTORY_DAYS)

    val zone = zoneOf(userID)
    val since = startOfDay(System.currentTimeMillis() - (days - 1) * DAY_MS, zone)

    call.respond(integration.history(userID, since))
}

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

private fun ApplicationCall.integrationName(): String {
    val name = parameters["name"] ?: Error.text("missing integration name")
    if (name !in Integrations.byName) Error.notFound("integration")
    return name
}

fun Route.integrationRoutes() {
    authenticate("jwt") {
        route("/integrations") {
            get("", INTEGRATION_LIST_ROUTE)
            // Per-integration sub-routes — must come before /{name} so Ktor matches the more
            // specific path first.
            appleFitnessRoutes()
            get("/{name}/history", INTEGRATION_HISTORY_ROUTE)
            post("/{name}", INTEGRATION_ENABLE_ROUTE)
            delete("/{name}", INTEGRATION_DISABLE_ROUTE)
            get("/{name}", INTEGRATION_GET_ROUTE)
        }
    }
}
