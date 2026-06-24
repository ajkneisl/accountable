package features.streak

import api.Cache
import api.Error
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingContext
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import java.util.UUID
import kotlinx.serialization.Serializable

/**
 * Response for [STREAK_GET_ROUTE].
 *
 * @param streak Consecutive passing UTC days ending today.
 */
@Serializable data class StreakResponse(val streak: Int)

/**
 * Response for [STREAK_HISTORY_ROUTE].
 *
 * @param days Per-day status for the last N UTC days, oldest first. The final entry is today.
 */
@Serializable data class StreakHistoryResponse(val days: List<DayStatus>)

private const val DEFAULT_HISTORY_DAYS = 14
private const val MAX_HISTORY_DAYS = 90

/** GET /api/streak — current streak for the authenticated user. */
private val STREAK_GET_ROUTE: suspend RoutingContext.() -> Unit = {
    call.respond(streakView(call.userID()))
}

/** GET /api/streak/recent?days=N — per-day status for the last N days (default 14). */
private val STREAK_HISTORY_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val days =
        call.request.queryParameters["days"]?.toIntOrNull()?.coerceIn(1, MAX_HISTORY_DAYS)
            ?: DEFAULT_HISTORY_DAYS
    call.respond(streakHistoryView(userID, days))
}

/** The user's current streak, cached. Reused by the dashboard. */
suspend fun streakView(userID: UUID): StreakResponse =
    Cache.cachedForUser(userID, "streak", StreakResponse.serializer()) {
        StreakResponse(currentStreak(userID, System.currentTimeMillis()))
    }

/** The user's last-[days] day-statuses, cached. Reused by the dashboard. */
suspend fun streakHistoryView(userID: UUID, days: Int): StreakHistoryResponse =
    Cache.cachedForUser(userID, "streakhist:$days", StreakHistoryResponse.serializer()) {
        StreakHistoryResponse(streakHistory(userID, days, System.currentTimeMillis()))
    }

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

fun Route.streakRoutes() {
    authenticate("jwt") {
        route("/streak") {
            get("", STREAK_GET_ROUTE)
            get("/recent", STREAK_HISTORY_ROUTE)
        }
    }
}
