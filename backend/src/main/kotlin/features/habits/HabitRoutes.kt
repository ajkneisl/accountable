package features.habits

import api.Cache
import api.Error
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
import io.ktor.server.routing.patch
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlinx.serialization.Serializable
import user.zoneOf

/** Default heatmap length: 18 full weeks, enough to fill a phone-width grid. */
private const val DEFAULT_HABIT_DAYS = 126
private const val MIN_HABIT_DAYS = 7

/** Upper bound on the heatmap window — a little over a year. */
private const val MAX_HABIT_DAYS = 371

/** How far back streaks are counted, independent of the requested heatmap window. */
private const val STREAK_LOOKBACK_DAYS = 366

/**
 * Request body for creating a habit.
 *
 * @param name Display name; trimmed, 1–[HABIT_NAME_MAX] characters.
 * @param color Heatmap accent.
 */
@Serializable
data class CreateHabitRequest(val name: String, val color: HabitColor = HabitColor.LIME)

/**
 * Request body for editing a habit. Omitted fields are left unchanged.
 *
 * @param name New display name; trimmed, 1–[HABIT_NAME_MAX] characters.
 * @param color New heatmap accent.
 */
@Serializable
data class UpdateHabitRequest(val name: String? = null, val color: HabitColor? = null)

/**
 * One habit with its heatmap window.
 *
 * @param id Habit ID.
 * @param name Display name.
 * @param color Heatmap accent.
 * @param createdAt Ms epoch when the habit was created.
 * @param done Whether the habit was done on each day of the window, oldest first; the last entry
 *   is today. Aligned with [HabitsResponse.start].
 * @param streak Consecutive days done, ending today (or yesterday, if today isn't checked yet).
 * @param total Days done within the window.
 */
@Serializable
data class HabitResponse(
    val id: String,
    val name: String,
    val color: HabitColor,
    val createdAt: Long,
    val done: List<Boolean>,
    val streak: Int,
    val total: Int,
)

/**
 * Every habit for the user over a shared window, so all heatmaps line up column for column.
 *
 * @param start First day of the window (`yyyy-MM-dd`, user's timezone).
 * @param today Last day of the window (`yyyy-MM-dd`, user's timezone).
 * @param habits The user's habits, oldest first.
 */
@Serializable
data class HabitsResponse(val start: String, val today: String, val habits: List<HabitResponse>)

/** GET /api/habits?days=N — the user's habits with an N-day heatmap window (default 126). */
private val HABIT_LIST_ROUTE: suspend RoutingContext.() -> Unit = {
    call.respond(habitsView(call.userID(), call.days()))
}

/** POST /api/habits?days=N — create a habit; responds with the refreshed list. */
private val HABIT_CREATE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<CreateHabitRequest>()
    val name = habitName(req.name)
    if (habitsFor(userID).size >= MAX_HABITS) Error.text("you can track at most $MAX_HABITS habits")

    createHabit(userID, name, req.color)
    Cache.invalidateUser(userID)
    call.respond(HttpStatusCode.Created, habitsView(userID, call.days()))
}

/** PATCH /api/habits/{id}?days=N — rename and/or recolor a habit; responds with the refreshed list. */
private val HABIT_UPDATE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<UpdateHabitRequest>()
    if (req.name == null && req.color == null) Error.text("nothing to update")

    if (!updateHabit(userID, call.habitID(), req.name?.let(::habitName), req.color)) {
        Error.notFound("habit")
    }
    Cache.invalidateUser(userID)
    call.respond(habitsView(userID, call.days()))
}

/** DELETE /api/habits/{id} — remove a habit and its history. */
private val HABIT_DELETE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    if (!deleteHabit(userID, call.habitID())) Error.notFound("habit")
    Cache.invalidateUser(userID)
    call.respond(HttpStatusCode.NoContent)
}

/**
 * PUT /api/habits/{id}/checkins/{date}?days=N — mark the habit done on `date` (`yyyy-MM-dd`).
 * DELETE on the same path un-marks it. Both respond with the refreshed list.
 */
private fun checkinRoute(done: Boolean): suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val habitID = call.habitID()
    val day =
        call.parameters["date"]?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
            ?: Error.text("date must be yyyy-MM-dd")

    val today = todayFor(userID)
    if (day.isAfter(today)) Error.text("can't check in a day that hasn't happened yet")
    if (day.isBefore(today.minusDays(MAX_HABIT_DAYS.toLong()))) Error.text("that day is too far back")
    habitFor(userID, habitID) ?: Error.notFound("habit")

    setCheckin(userID, habitID, day, done)
    Cache.invalidateUser(userID)
    call.respond(habitsView(userID, call.days()))
}

/** The user's habits over a [days]-long window ending today, cached. */
suspend fun habitsView(userID: UUID, days: Int): HabitsResponse =
    Cache.cachedForUser(userID, "habits:$days", HabitsResponse.serializer()) {
        val today = todayFor(userID)
        val start = today.minusDays((days - 1).toLong())
        val lookback = today.minusDays(maxOf(days, STREAK_LOOKBACK_DAYS).toLong())
        val checkins = checkinsFor(userID, lookback, today)

        HabitsResponse(
            start = start.toString(),
            today = today.toString(),
            habits =
                habitsFor(userID).map { habit ->
                    val done = checkins[habit.id].orEmpty()
                    val window = (0 until days).map { start.plusDays(it.toLong()) in done }
                    HabitResponse(
                        id = habit.id.toString(),
                        name = habit.name,
                        color = habit.color,
                        createdAt = habit.createdAt,
                        done = window,
                        streak = habitStreak(done, today),
                        total = window.count { it },
                    )
                },
        )
    }

/** [raw] trimmed, or a 400 if it's blank or longer than [HABIT_NAME_MAX]. */
private fun habitName(raw: String): String {
    val name = raw.trim()
    if (name.isEmpty()) Error.text("name must not be blank")
    if (name.length > HABIT_NAME_MAX) Error.text("name must be at most $HABIT_NAME_MAX characters")
    return name
}

/** Today's date in [userID]'s timezone. */
private fun todayFor(userID: UUID): LocalDate =
    Instant.ofEpochMilli(System.currentTimeMillis()).atZone(zoneOf(userID)).toLocalDate()

private fun ApplicationCall.days(): Int =
    request.queryParameters["days"]?.toIntOrNull()?.coerceIn(MIN_HABIT_DAYS, MAX_HABIT_DAYS)
        ?: DEFAULT_HABIT_DAYS

private fun ApplicationCall.habitID(): UUID =
    parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
        ?: Error.text("invalid habit id")

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

fun Route.habitRoutes() {
    authenticate("jwt") {
        route("/habits") {
            get("", HABIT_LIST_ROUTE)
            post("", HABIT_CREATE_ROUTE)
            patch("/{id}", HABIT_UPDATE_ROUTE)
            delete("/{id}", HABIT_DELETE_ROUTE)
            put("/{id}/checkins/{date}", checkinRoute(done = true))
            delete("/{id}/checkins/{date}", checkinRoute(done = false))
        }
    }
}
