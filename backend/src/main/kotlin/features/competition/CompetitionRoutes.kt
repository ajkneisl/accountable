package features.competition

import api.Cache
import api.Error
import features.goals.GoalPeriod
import features.goals.weekValues
import features.goals.weekWindow
import features.streak.streakFor
import integrations.api.Integrations
import integrations.api.startOfDay
import features.goals.GoalMetrics
import features.habits.HabitColor
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
import io.ktor.server.routing.route
import java.util.UUID
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import user.defaultColor
import user.displayColor
import user.findUserByID
import user.zoneOf

/** Request body for creating a competition. */
@Serializable data class CreateCompetitionRequest(val name: String)

/**
 * Request body for changing a competition; omitted fields are left alone.
 *
 * @param name A new name.
 * @param ownerID A member to hand ownership to. The caller stays a member.
 */
@Serializable data class UpdateCompetitionRequest(val name: String? = null, val ownerID: String? = null)

/** Request body for joining via a [Competition.joinCode]. */
@Serializable data class JoinCompetitionRequest(val joinCode: String)

/** Request body for adding a goal to a competition. */
@Serializable
data class CreateCompetitionGoalRequest(
    val integration: String,
    val metric: String,
    val period: GoalPeriod,
    val target: Long,
)

/** Summary of a competition for list views. Omits members/goals. */
@Serializable
data class CompetitionSummary(
    val id: String,
    val name: String,
    val ownerID: String,
    val joinCode: String,
    val createdAt: Long,
)

/** Member entry with their current streak inside the competition, and the color they're shown in. */
@Serializable
data class CompetitionMemberView(
    val userID: String,
    val username: String,
    val joinedAt: Long,
    val streak: Int,
    val color: HabitColor,
)

/** Competition goal payload. */
@Serializable
data class CompetitionGoalView(
    val integration: String,
    val metric: String,
    val period: GoalPeriod,
    val target: Long,
    val createdAt: Long,
)

/** Full competition view returned by GET /api/competitions/{id}. */
@Serializable
data class CompetitionDetailResponse(
    val id: String,
    val name: String,
    val ownerID: String,
    val joinCode: String,
    val createdAt: Long,
    val members: List<CompetitionMemberView>,
    val goals: List<CompetitionGoalView>,
)

/** One member's Monday-first daily values for a single competition goal over a week. */
@Serializable
data class CompetitionMemberWeek(
    val userID: String,
    val username: String,
    /** Per-day metric values for the seven days of the week, Monday first. */
    val vals: List<Long>,
    val total: Long,
)

/** A competition goal with every member's week of progress against it. */
@Serializable
data class CompetitionGoalBoard(
    val integration: String,
    val metric: String,
    val period: GoalPeriod,
    val target: Long,
    val members: List<CompetitionMemberWeek>,
)

/** Weekview board returned by [COMPETITION_WEEK_ROUTE]: every shared goal × every member × day. */
@Serializable
data class CompetitionWeekResponse(
    /** Monday 00:00 (ms epoch) of the week, in the requester's timezone. */
    val weekStart: Long,
    /** The following Monday 00:00 (ms epoch), exclusive. */
    val weekEnd: Long,
    val offset: Int,
    val goals: List<CompetitionGoalBoard>,
)

/** Longest name the `competitions.name` column holds. */
private const val NAME_MAX_LENGTH = 64

/** [name] trimmed, or a 400 if it's blank or too long. */
private fun validName(name: String): String {
    val trimmed = name.trim()
    if (trimmed.isEmpty()) Error.text("name must not be blank")
    if (trimmed.length > NAME_MAX_LENGTH) Error.text("name must be at most $NAME_MAX_LENGTH characters")
    return trimmed
}

/** POST /api/competitions — create a competition. Caller becomes owner + first member. */
private val COMPETITION_CREATE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<CreateCompetitionRequest>()

    val competition = createCompetition(userID, validName(req.name))
    Cache.invalidateUser(userID)
    call.respond(competition.toSummary())
}

/** GET /api/competitions — list every competition the caller belongs to. */
private val COMPETITION_LIST_ROUTE: suspend RoutingContext.() -> Unit = {
    call.respond(competitionsView(call.userID()))
}

/** Summaries of the user's competitions, cached. Reused by the dashboard. */
suspend fun competitionsView(userID: UUID): List<CompetitionSummary> =
    Cache.cachedForUser(
        userID,
        "competitions",
        ListSerializer(CompetitionSummary.serializer()),
    ) {
        competitionsFor(userID).map { it.toSummary() }
    }

/** GET /api/competitions/{id} — full detail with member streaks + shared goals. */
private val COMPETITION_DETAIL_ROUTE: suspend RoutingContext.() -> Unit = {
    call.respond(competitionDetailView(call.competitionForMember(call.userID())))
}

/**
 * Full competition detail with member streaks, cached per competition. The response is identical
 * for every member (no requester-specific fields); member streaks reflect each member's own
 * activity within the competition TTL. Reused by the dashboard's top-competition panel.
 */
suspend fun competitionDetailView(competition: Competition): CompetitionDetailResponse =
    Cache.cachedForCompetition(
        competition.id,
        "detail",
        CompetitionDetailResponse.serializer(),
    ) {
        val goals = goalsForCompetition(competition.id)
        val members = membersOf(competition.id)
        val now = System.currentTimeMillis()

        val memberViews =
            members.map { member ->
                val user = findUserByID(member.userID)
                val username = user?.username ?: member.userID.toString()
                val streak =
                    streakFor(
                        userID = member.userID,
                        goals = goals,
                        now = now,
                        floor = startOfDay(member.joinedAt, zoneOf(member.userID)),
                    )
                CompetitionMemberView(
                    userID = member.userID.toString(),
                    username = username,
                    joinedAt = member.joinedAt,
                    streak = streak,
                    color = user?.displayColor ?: defaultColor(member.userID),
                )
            }

        CompetitionDetailResponse(
            id = competition.id.toString(),
            name = competition.name,
            ownerID = competition.ownerID.toString(),
            joinCode = competition.joinCode,
            createdAt = competition.createdAt,
            members = memberViews,
            goals = goals.map { it.toView() },
        )
    }

/**
 * GET /api/competitions/{id}/week?offset=N
 *
 * The competition's goals dashboard: for each shared goal, every member's Monday-anchored week of
 * daily progress `offset` weeks before the current week (0 = this week). Each member's days are
 * bucketed in their own timezone, so the columns line up by local weekday.
 */
private val COMPETITION_WEEK_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForMember(userID)

    val offset = call.request.queryParameters["offset"]?.toIntOrNull() ?: 0
    if (offset < 0) Error.text("offset must not be negative")

    // The board content is requester-independent, but the weekStart/weekEnd labels are in the
    // requester's zone — so the cache is keyed by offset + zone as well as the competition.
    val requesterZone = zoneOf(userID)
    val response =
        Cache.cachedForCompetition(
            competition.id,
            "week:$offset:${requesterZone.id}",
            CompetitionWeekResponse.serializer(),
        ) {
            val now = System.currentTimeMillis()
            val goals = goalsForCompetition(competition.id)
            val members = membersOf(competition.id)
            val usernames =
                members.associateWith {
                    findUserByID(it.userID)?.username ?: it.userID.toString()
                }

            val boards =
                goals.map { goal ->
                    val memberWeeks =
                        members.map { member ->
                            val zone = zoneOf(member.userID)
                            val (weekStart, _) = weekWindow(now, zone, offset)
                            val vals = weekValues(member.userID, goal, weekStart, zone)
                            CompetitionMemberWeek(
                                userID = member.userID.toString(),
                                username = usernames.getValue(member),
                                vals = vals,
                                total = vals.sum(),
                            )
                        }
                    CompetitionGoalBoard(
                        integration = goal.integration,
                        metric = goal.metric,
                        period = goal.period,
                        target = goal.target,
                        members = memberWeeks,
                    )
                }

            val (weekStart, weekEnd) = weekWindow(now, requesterZone, offset)
            CompetitionWeekResponse(
                weekStart = weekStart,
                weekEnd = weekEnd,
                offset = offset,
                goals = boards,
            )
        }

    call.respond(response)
}

/** DELETE /api/competitions/{id} — owner deletes the competition. Cascades to members and goals. */
private val COMPETITION_DELETE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForOwner(userID)
    // Every member's competitions list changes, so invalidate each before the rows disappear.
    val members = membersOf(competition.id)
    deleteCompetition(competition.id)
    members.forEach { Cache.invalidateUser(it.userID) }
    Cache.invalidateCompetition(competition.id)
    call.respond(HttpStatusCode.NoContent)
}

/** PATCH /api/competitions/{id} — owner renames the competition or hands it to another member. */
private val COMPETITION_UPDATE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForOwner(userID)
    val req = call.receive<UpdateCompetitionRequest>()

    val name = req.name?.let(::validName)
    val owner =
        req.ownerID?.let { raw ->
            val id = runCatching { UUID.fromString(raw) }.getOrNull() ?: Error.text("invalid owner id")
            if (!isMember(id, competition.id)) Error.text("the new owner must be a member")
            id
        }

    name?.let { renameCompetition(competition.id, it) }
    owner?.let { transferCompetition(competition.id, it) }
    // The name and owner are in every member's competitions list.
    membersOf(competition.id).forEach { Cache.invalidateUser(it.userID) }
    Cache.invalidateCompetition(competition.id)
    call.respond(
        competition.copy(name = name ?: competition.name, ownerID = owner ?: competition.ownerID).toSummary()
    )
}

/** POST /api/competitions/{id}/join-code — owner replaces the join code; the old one stops working. */
private val COMPETITION_JOIN_CODE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForOwner(userID)

    val joinCode = resetJoinCode(competition.id)
    membersOf(competition.id).forEach { Cache.invalidateUser(it.userID) }
    Cache.invalidateCompetition(competition.id)
    call.respond(competition.copy(joinCode = joinCode).toSummary())
}

/**
 * DELETE /api/competitions/{id}/members/{userID} — owner removes a member. They can join again
 * with the join code unless it's reset.
 */
private val COMPETITION_MEMBER_DELETE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForOwner(userID)

    val member =
        call.parameters["userID"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
            ?: Error.text("invalid user id")
    if (member == competition.ownerID) Error.text("the owner can't be removed")
    if (!leaveCompetition(member, competition.id)) Error.notFound("member")
    Cache.invalidateUser(member) // their competitions list
    Cache.invalidateCompetition(competition.id) // detail loses a member
    call.respond(HttpStatusCode.NoContent)
}

/** POST /api/competitions/join — join via a join code. */
private val COMPETITION_JOIN_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<JoinCompetitionRequest>()
    val competition =
        findCompetitionByJoinCode(req.joinCode.trim().uppercase())
            ?: Error.notFound("competition")
    joinCompetition(userID, competition.id)
    Cache.invalidateUser(userID) // joiner's competitions list
    Cache.invalidateCompetition(competition.id) // detail gains a member
    call.respond(competition.toSummary())
}

/** POST /api/competitions/{id}/leave — leave a competition. Owners must delete instead. */
private val COMPETITION_LEAVE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForMember(userID)
    if (competition.ownerID == userID) {
        Error.text("owner cannot leave; hand the competition to another member or delete it")
    }
    leaveCompetition(userID, competition.id)
    Cache.invalidateUser(userID) // leaver's competitions list
    Cache.invalidateCompetition(competition.id) // detail loses a member
    call.respond(HttpStatusCode.NoContent)
}

/** POST /api/competitions/{id}/goals — owner adds or updates a goal. */
private val COMPETITION_GOAL_CREATE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForOwner(userID)

    val req = call.receive<CreateCompetitionGoalRequest>()
    if (req.integration !in Integrations.byName) Error.notFound("integration")
    if (GoalMetrics.byKey[req.integration to req.metric] == null) {
        Error.text("metric '${req.metric}' is not supported for integration '${req.integration}'")
    }
    if (req.target <= 0) Error.text("target must be positive")

    val goal =
        upsertCompetitionGoal(
            competitionID = competition.id,
            integration = req.integration,
            metric = req.metric,
            period = req.period,
            target = req.target,
        )
    Cache.invalidateCompetition(competition.id)
    call.respond(goal.toView())
}

/** DELETE /api/competitions/{id}/goals/{integration}/{metric}/{period} — owner removes a goal. */
private val COMPETITION_GOAL_DELETE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForOwner(userID)

    val integration = call.parameters["integration"] ?: Error.text("missing integration")
    val metric = call.parameters["metric"] ?: Error.text("missing metric")
    val periodRaw = call.parameters["period"] ?: Error.text("missing period")
    val period =
        runCatching { GoalPeriod.valueOf(periodRaw.uppercase()) }.getOrNull()
            ?: Error.text("period must be DAILY or WEEKLY")

    val removed = deleteCompetitionGoal(competition.id, integration, metric, period)
    if (!removed) Error.notFound("goal")
    Cache.invalidateCompetition(competition.id)
    call.respond(HttpStatusCode.NoContent)
}

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

private fun ApplicationCall.competitionID(): UUID =
    parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
        ?: Error.text("invalid competition id")

private suspend fun ApplicationCall.competitionForMember(userID: UUID): Competition {
    val id = competitionID()
    val competition = findCompetitionByID(id) ?: Error.notFound("competition")
    if (!isMember(userID, id)) Error.unauthorized("not a member of this competition")
    return competition
}

private suspend fun ApplicationCall.competitionForOwner(userID: UUID): Competition {
    val id = competitionID()
    val competition = findCompetitionByID(id) ?: Error.notFound("competition")
    if (competition.ownerID != userID) Error.unauthorized("only the owner can do that")
    return competition
}

private fun Competition.toSummary() =
    CompetitionSummary(
        id = id.toString(),
        name = name,
        ownerID = ownerID.toString(),
        joinCode = joinCode,
        createdAt = createdAt,
    )

private fun CompetitionGoal.toView() =
    CompetitionGoalView(
        integration = integration,
        metric = metric,
        period = period,
        target = target,
        createdAt = createdAt,
    )

fun Route.competitionRoutes() {
    authenticate("jwt") {
        route("/competitions") {
            post("", COMPETITION_CREATE_ROUTE)
            get("", COMPETITION_LIST_ROUTE)
            post("/join", COMPETITION_JOIN_ROUTE)
            get("/{id}/week", COMPETITION_WEEK_ROUTE)
            get("/{id}", COMPETITION_DETAIL_ROUTE)
            patch("/{id}", COMPETITION_UPDATE_ROUTE)
            delete("/{id}", COMPETITION_DELETE_ROUTE)
            post("/{id}/join-code", COMPETITION_JOIN_CODE_ROUTE)
            delete("/{id}/members/{userID}", COMPETITION_MEMBER_DELETE_ROUTE)
            post("/{id}/leave", COMPETITION_LEAVE_ROUTE)
            post("/{id}/goals", COMPETITION_GOAL_CREATE_ROUTE)
            delete("/{id}/goals/{integration}/{metric}/{period}", COMPETITION_GOAL_DELETE_ROUTE)
        }
    }
}
