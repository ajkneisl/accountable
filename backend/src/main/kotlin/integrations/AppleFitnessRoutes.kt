package integrations

import api.Error
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
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
 * Request body for manually logging a workout. The future iOS bridge will POST the same shape
 * (with `source = APPLE`) once a companion app exists.
 */
@Serializable
data class LogWorkoutRequest(
    val type: WorkoutType,
    val durationMin: Long,
    val calories: Long,
    /** Ms epoch when the workout happened. Defaults to now if omitted. */
    val happenedAt: Long? = null,
)

/** GET /api/integrations/apple_fitness/workouts?date={ms} — workouts for the day containing date. */
private val WORKOUT_LIST_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val dateMs =
        call.request.queryParameters["date"]?.toLongOrNull() ?: System.currentTimeMillis()
    call.respond(workoutsForDay(userID, dateMs))
}

/** POST /api/integrations/apple_fitness/workouts — log a workout. */
private val WORKOUT_CREATE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<LogWorkoutRequest>()
    if (req.durationMin < 0) Error.text("durationMin must be non-negative")
    if (req.calories < 0) Error.text("calories must be non-negative")
    val workout =
        addWorkout(
            userID = userID,
            type = req.type,
            durationMin = req.durationMin,
            calories = req.calories,
            happenedAt = req.happenedAt ?: System.currentTimeMillis(),
        )
    call.respond(HttpStatusCode.Created, workout)
}

/** DELETE /api/integrations/apple_fitness/workouts/{id} — remove a workout. */
private val WORKOUT_DELETE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val rawId = call.parameters["id"] ?: Error.text("missing workout id")
    val workoutID =
        runCatching { UUID.fromString(rawId) }.getOrNull()
            ?: Error.text("invalid workout id")
    val removed = removeWorkout(userID, workoutID)
    if (!removed) Error.notFound("workout")
    call.respond(HttpStatusCode.NoContent)
}

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

/**
 * Mounted under /api/integrations so auth + path-prefix from [integrations.api.integrationRoutes]
 * apply. Specific paths win over the generic /{name} routes in Ktor.
 */
fun Route.appleFitnessRoutes() {
    route("/apple_fitness/workouts") {
        get("", WORKOUT_LIST_ROUTE)
        post("", WORKOUT_CREATE_ROUTE)
        delete("/{id}", WORKOUT_DELETE_ROUTE)
    }
}
