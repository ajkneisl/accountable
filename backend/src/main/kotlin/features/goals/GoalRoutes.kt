package features.goals

import api.Cache
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
import kotlinx.serialization.builtins.ListSerializer
import user.zoneOf

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
 * @param weekStart Monday 00:00 (ms epoch) of the current week, in the user's timezone.
 * @param weekVals The current Monday-anchored week's per-day metric values, Monday first. Lets the
 *   goal card render its week chart without a follow-up `/week` request.
 * @param weekTotal Sum of [weekVals].
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
    val weekStart: Long,
    val weekVals: List<Long>,
    val weekTotal: Long,
)

/**
 * One Monday-anchored week of a goal's metric, returned by [GOAL_WEEK_ROUTE].
 *
 * @param weekStart Monday 00:00 (ms epoch) of the week, in the user's timezone.
 * @param weekEnd The following Monday 00:00 (ms epoch), exclusive.
 * @param vals Per-day metric values for the seven days of the week, Monday first.
 * @param total Sum of [vals] — the goal's progress for that week.
 * @param target The goal's target (interpreted per [period]).
 * @param period The goal's reset cadence.
 */
@Serializable
data class GoalWeekResponse(
    val weekStart: Long,
    val weekEnd: Long,
    val vals: List<Long>,
    val total: Long,
    val target: Long,
    val period: GoalPeriod,
)

/** POST /api/goals — create or replace a goal for the authenticated user. */
private val GOAL_CREATE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<CreateGoalRequest>()

    validateMetric(req.integration, req.metric)
    if (req.target <= 0) Error.text("target must be positive")

    val goal = upsertGoal(userID, req.integration, req.metric, req.period, req.target)
    Cache.invalidateUser(userID)
    call.respond(buildGoalResponse(userID, goal, System.currentTimeMillis(), zoneOf(userID)))
}

/** GET /api/goals — list the authenticated user's goals with current progress. */
private val GOAL_LIST_ROUTE: suspend RoutingContext.() -> Unit = {
    call.respond(goalsView(call.userID()))
}

/** The authenticated user's goals with current progress + week, cached. Reused by the dashboard. */
suspend fun goalsView(userID: UUID): List<GoalResponse> =
    Cache.cachedForUser(userID, "goals", ListSerializer(GoalResponse.serializer())) {
        val now = System.currentTimeMillis()
        val zone = zoneOf(userID)
        goalsFor(userID).map { buildGoalResponse(userID, it, now, zone) }
    }

/** Compose one goal's full response: current-period progress, last-7-days, and this week. */
private suspend fun buildGoalResponse(
    userID: UUID,
    goal: Goal,
    now: Long,
    zone: java.time.ZoneId,
): GoalResponse {
    val (weekStart, _) = weekWindow(now, zone, 0)
    val weekVals = weekValues(userID, goal, weekStart, zone)
    return GoalResponse(
        integration = goal.integration,
        metric = goal.metric,
        period = goal.period,
        target = goal.target,
        progress = progressFor(userID, goal, now),
        vals = perDayValues(userID, goal, days = 7, now = now),
        createdAt = goal.createdAt,
        weekStart = weekStart,
        weekVals = weekVals,
        weekTotal = weekVals.sum(),
    )
}

/**
 * GET /api/goals/{integration}/{metric}/{period}/week?offset=N
 *
 * Returns the Monday-anchored week of the goal's metric `offset` weeks before the current week
 * (offset 0 = this week, 1 = last week, …). Lets the UI page back through past weeks per goal.
 * Weeks are fixed Monday→Monday windows in the user's timezone.
 */
private val GOAL_WEEK_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val integration = call.parameters["integration"] ?: Error.text("missing integration")
    val metric = call.parameters["metric"] ?: Error.text("missing metric")
    val periodRaw = call.parameters["period"] ?: Error.text("missing period")
    val period =
        runCatching { GoalPeriod.valueOf(periodRaw.uppercase()) }.getOrNull()
            ?: Error.text("period must be DAILY or WEEKLY")

    val offset = call.request.queryParameters["offset"]?.toIntOrNull() ?: 0
    if (offset < 0) Error.text("offset must not be negative")

    val goal = goalFor(userID, integration, metric, period) ?: Error.notFound("goal")

    val zone = zoneOf(userID)
    val (weekStart, weekEnd) = weekWindow(System.currentTimeMillis(), zone, offset)
    val vals = weekValues(userID, goal, weekStart, zone)

    call.respond(
        GoalWeekResponse(
            weekStart = weekStart,
            weekEnd = weekEnd,
            vals = vals,
            total = vals.sum(),
            target = goal.target,
            period = goal.period,
        )
    )
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
    Cache.invalidateUser(userID)
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

fun Route.goalRoutes() {
    authenticate("jwt") {
        route("/goals") {
            post("", GOAL_CREATE_ROUTE)
            get("", GOAL_LIST_ROUTE)
            get("/{integration}/{metric}/{period}/week", GOAL_WEEK_ROUTE)
            delete("/{integration}/{metric}/{period}", GOAL_DELETE_ROUTE)
        }
    }
}
