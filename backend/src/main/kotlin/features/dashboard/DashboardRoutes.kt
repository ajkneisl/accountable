package features.dashboard

import api.Error
import features.competition.CompetitionDetailResponse
import features.competition.CompetitionSummary
import features.competition.competitionDetailView
import features.competition.competitionsView
import features.competition.findCompetitionByID
import features.goals.GoalResponse
import features.goals.goalsView
import features.streak.DayStatus
import features.streak.streakHistoryView
import features.streak.streakView
import integrations.WorkoutResponse
import integrations.api.IntegrationStatus
import integrations.api.integrationsView
import integrations.workoutsForDay
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingContext
import io.ktor.server.routing.get
import java.util.UUID
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.Serializable

/**
 * Everything the dashboard renders, in a single response — so the client loads with one request
 * instead of fanning out to /goals, /streak, /streak/recent, /competitions, the top competition's
 * detail, /integrations, and the workouts list separately.
 */
@Serializable
data class DashboardResponse(
    val goals: List<GoalResponse>,
    val streak: Int,
    val history: List<DayStatus>,
    val competitions: List<CompetitionSummary>,
    /** Detail for the first competition (the one the sidebar/dashboard highlight), or null. */
    val topCompetition: CompetitionDetailResponse?,
    val workouts: List<WorkoutResponse>,
    val integrations: List<IntegrationStatus>,
)

/**
 * GET /api/dashboard
 *
 * Aggregates every dashboard view in one round trip. Each section is computed concurrently and
 * served from the same per-user / per-competition cache the individual endpoints use, so a warm
 * dashboard is a handful of fast Redis reads behind a single HTTP request.
 */
private val DASHBOARD_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val now = System.currentTimeMillis()

    coroutineScope {
        val goals = async { goalsView(userID) }
        val streak = async { streakView(userID).streak }
        val history = async { streakHistoryView(userID, HISTORY_DAYS).days }
        val competitions = async { competitionsView(userID) }
        val workouts = async { workoutsForDay(userID, now) }
        val integrations = async { integrationsView(userID) }

        val comps = competitions.await()
        val topCompetition =
            comps.firstOrNull()
                ?.let { findCompetitionByID(UUID.fromString(it.id)) }
                ?.let { competitionDetailView(it) }

        call.respond(
            DashboardResponse(
                goals = goals.await(),
                streak = streak.await(),
                history = history.await(),
                competitions = comps,
                topCompetition = topCompetition,
                workouts = workouts.await(),
                integrations = integrations.await(),
            )
        )
    }
}

/** Matches the dashboard's last-14-days streak strip. */
private const val HISTORY_DAYS = 14

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

fun Route.dashboardRoutes() {
    authenticate("jwt") { get("/dashboard", DASHBOARD_ROUTE) }
}
