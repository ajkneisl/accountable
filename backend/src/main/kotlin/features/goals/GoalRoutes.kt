package features.goals

import api.Error
import integrations.api.Integrations
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

/**
 * Request body for creating or replacing a goal.
 *
 * @param integration Provider name; must match an enabled [integrations.api.Integration].
 * @param metric Metric key registered in [GoalMetrics] for [integration].
 * @param period One of [GoalPeriod] names: `"DAILY"` or `"WEEKLY"`.
 * @param target Positive target count for the [period] window.
 */
@Serializable
data class CreateGoalRequest(
    val integration: String,
    val metric: String,
    val period: GoalPeriod,
    val target: Long,
)

/**
 * Goal payload with current-period progress and the last 7 days of raw values.
 *
 * @param integration Provider name.
 * @param metric Metric key.
 * @param period [GoalPeriod] name.
 * @param target Goal target.
 * @param progress Sum of [metric] for the current [period] window.
 * @param vals Per-day [metric] values for the last 7 UTC days, oldest first; today is `vals[6]`.
 * @param createdAt Ms epoch when the goal was created.
 */
@Serializable
data class GoalResponse(
    val integration: String,
    val metric: String,
    val period: GoalPeriod,
    val target: Long,
    val progress: Long,
    val vals: List<Long>,
    val createdAt: Long,
)

/** POST /api/goals — create or replace a goal for the authenticated user. */
private val GOAL_CREATE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<CreateGoalRequest>()

    validateMetric(req.integration, req.metric)
    if (req.target <= 0) Error.text("target must be positive")

    val goal = upsertGoal(userID, req.integration, req.metric, req.period, req.target)
    val now = System.currentTimeMillis()
    call.respond(
        goal.toResponse(
            progress = progressFor(userID, goal, now),
            vals = perDayValues(userID, goal, days = 7, now = now),
        )
    )
}

/** GET /api/goals — list the authenticated user's goals with current progress. */
private val GOAL_LIST_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val now = System.currentTimeMillis()
    val goals = goalsFor(userID)
    val response =
        goals.map { goal ->
            goal.toResponse(
                progress = progressFor(userID, goal, now),
                vals = perDayValues(userID, goal, days = 7, now = now),
            )
        }
    call.respond(response)
}

/** DELETE /api/goals/{integration}/{metric}/{period} — remove one goal. */
private val GOAL_DELETE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val integration = call.parameters["integration"] ?: Error.text("missing integration")
    val metric = call.parameters["metric"] ?: Error.text("missing metric")
    val periodRaw = call.parameters["period"] ?: Error.text("missing period")
    val period =
        runCatching { GoalPeriod.valueOf(periodRaw.uppercase()) }.getOrNull()
            ?: Error.text("period must be DAILY or WEEKLY")

    val removed = deleteGoal(userID, integration, metric, period)
    if (!removed) Error.notFound("goal")
    call.respond(HttpStatusCode.NoContent)
}

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

private fun validateMetric(integration: String, metric: String) {
    if (integration !in Integrations.byName) Error.notFound("integration")
    if (GoalMetrics.byKey[integration to metric] == null) {
        Error.text("metric '$metric' is not supported for integration '$integration'")
    }
}

private fun Goal.toResponse(progress: Long, vals: List<Long>) =
    GoalResponse(
        integration = integration,
        metric = metric,
        period = period,
        target = target,
        progress = progress,
        vals = vals,
        createdAt = createdAt,
    )

fun Route.goalRoutes() {
    authenticate("jwt") {
        route("/goals") {
            post("", GOAL_CREATE_ROUTE)
            get("", GOAL_LIST_ROUTE)
            delete("/{integration}/{metric}/{period}", GOAL_DELETE_ROUTE)
        }
    }
}
