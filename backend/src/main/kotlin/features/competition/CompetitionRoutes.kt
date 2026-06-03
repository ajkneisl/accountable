package features.competition

import api.Error
import features.goals.GoalPeriod
import features.streak.streakFor
import integrations.api.Integrations
import integrations.api.startOfUtcDay
import features.goals.GoalMetrics
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
import user.findUserByID

/** Request body for creating a competition. */
@Serializable data class CreateCompetitionRequest(val name: String)

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

/** Member entry with their current streak inside the competition. */
@Serializable
data class CompetitionMemberView(
    val userID: String,
    val username: String,
    val joinedAt: Long,
    val streak: Int,
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

/** POST /api/competitions — create a competition. Caller becomes owner + first member. */
private val COMPETITION_CREATE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val req = call.receive<CreateCompetitionRequest>()
    if (req.name.isBlank()) Error.text("name must not be blank")

    val competition = createCompetition(userID, req.name.trim())
    call.respond(competition.toSummary())
}

/** GET /api/competitions — list every competition the caller belongs to. */
private val COMPETITION_LIST_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competitions = competitionsFor(userID)
    call.respond(competitions.map { it.toSummary() })
}

/** GET /api/competitions/{id} — full detail with member streaks + shared goals. */
private val COMPETITION_DETAIL_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForMember(userID)

    val goals = goalsForCompetition(competition.id)
    val members = membersOf(competition.id)
    val now = System.currentTimeMillis()

    val memberViews =
        members.map { member ->
            val username =
                findUserByID(member.userID)?.username ?: member.userID.toString()
            val streak =
                streakFor(
                    userID = member.userID,
                    goals = goals,
                    now = now,
                    floor = startOfUtcDay(member.joinedAt),
                )
            CompetitionMemberView(
                userID = member.userID.toString(),
                username = username,
                joinedAt = member.joinedAt,
                streak = streak,
            )
        }

    call.respond(
        CompetitionDetailResponse(
            id = competition.id.toString(),
            name = competition.name,
            ownerID = competition.ownerID.toString(),
            joinCode = competition.joinCode,
            createdAt = competition.createdAt,
            members = memberViews,
            goals = goals.map { it.toView() },
        )
    )
}

/** DELETE /api/competitions/{id} — owner deletes the competition. Cascades to members and goals. */
private val COMPETITION_DELETE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForOwner(userID)
    deleteCompetition(competition.id)
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
    call.respond(competition.toSummary())
}

/** POST /api/competitions/{id}/leave — leave a competition. Owners must delete instead. */
private val COMPETITION_LEAVE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val competition = call.competitionForMember(userID)
    if (competition.ownerID == userID) {
        Error.text("owner cannot leave; delete the competition instead")
    }
    leaveCompetition(userID, competition.id)
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
            get("/{id}", COMPETITION_DETAIL_ROUTE)
            delete("/{id}", COMPETITION_DELETE_ROUTE)
            post("/{id}/leave", COMPETITION_LEAVE_ROUTE)
            post("/{id}/goals", COMPETITION_GOAL_CREATE_ROUTE)
            delete("/{id}/goals/{integration}/{metric}/{period}", COMPETITION_GOAL_DELETE_ROUTE)
        }
    }
}
