package com.accountable.features

import api.Error
import auth.RegisterRequest
import auth.TokenResponse
import configureModule
import features.competition.CompetitionGoals
import features.competition.CompetitionMembers
import features.competition.Competitions
import features.competition.createCompetition
import features.competition.joinCompetition
import features.competition.leaveCompetition
import features.competition.upsertCompetitionGoal
import features.feed.FeedCursor
import features.feed.FeedLikes
import features.feed.FeedPostGoals
import features.feed.FeedPostView
import features.feed.FeedPosts
import features.feed.GitHubDetail
import features.feed.WorkoutDetail
import features.feed.deleteWorkoutPost
import features.feed.feedFor
import features.feed.likePost
import features.feed.syncFeedPosts
import features.feed.unlikePost
import features.goals.GoalPeriod
import features.goals.Goals
import features.goals.upsertGoal
import integrations.AppleFitnessTable
import integrations.AppleFitnessWorkouts
import integrations.AppleHealthImports
import integrations.AppleStepsTable
import integrations.GitHubTable
import integrations.ImportedWorkout
import integrations.ScreenTimeTable
import integrations.WorkoutType
import integrations.addWorkout
import integrations.importWorkouts
import integrations.api.IntegrationTable
import integrations.api.UserIntegrations
import integrations.removeWorkout
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.testing.testApplication
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.statements.UpdateBuilder
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import user.RefreshTokens
import user.SelfResponse
import user.Users
import user.createUser
import user.updateFeedDetails

private const val DAY_MS = 24L * 60 * 60 * 1000

class FeedTest {
    private val now = System.currentTimeMillis()
    private val todayStart = now - Math.floorMod(now, DAY_MS)
    private val yesterdayStart = todayStart - DAY_MS

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:feed-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(
                Users,
                RefreshTokens,
                UserIntegrations,
                Goals,
                Competitions,
                CompetitionMembers,
                CompetitionGoals,
                GitHubTable,
                AppleStepsTable,
                ScreenTimeTable,
                AppleFitnessTable,
                AppleFitnessWorkouts,
                AppleHealthImports,
                FeedPosts,
                FeedPostGoals,
                FeedLikes,
            )
            FeedLikes.deleteAll()
            FeedPostGoals.deleteAll()
            FeedPosts.deleteAll()
            AppleHealthImports.deleteAll()
            AppleFitnessWorkouts.deleteAll()
            AppleFitnessTable.deleteAll()
            ScreenTimeTable.deleteAll()
            AppleStepsTable.deleteAll()
            GitHubTable.deleteAll()
            CompetitionGoals.deleteAll()
            CompetitionMembers.deleteAll()
            Competitions.deleteAll()
            Goals.deleteAll()
            UserIntegrations.deleteAll()
            RefreshTokens.deleteAll()
            Users.deleteAll()
        }
    }

    private fun newUser(): UUID =
        createUser("u${UUID.randomUUID().toString().take(8)}", "${UUID.randomUUID()}@e.com", "hash", "UTC").id

    /** Two users in one competition with a shared goal on [integration]. */
    private suspend fun pair(
        integration: String = "github",
        metric: String = "commits",
        period: GoalPeriod = GoalPeriod.WEEKLY,
        target: Long = 5,
    ): Triple<UUID, UUID, UUID> {
        val actor = newUser()
        val viewer = newUser()
        val competition = createCompetition(actor, "Rivals").id
        joinCompetition(viewer, competition)
        upsertCompetitionGoal(competition, integration, metric, period, target)
        // Joining is stamped with the clock; anything after this is newer than both joins.
        Thread.sleep(5)
        return Triple(actor, viewer, competition)
    }

    private fun <T : IntegrationTable> row(
        table: T,
        userID: UUID,
        date: Long,
        fill: T.(UpdateBuilder<*>) -> Unit,
    ) = transaction {
        table.insert {
            it[table.userID] = userID
            it[table.date] = date
            table.fill(it)
        }
    }

    private fun commits(userID: UUID, count: Long, date: Long = todayStart, repos: String? = null) =
        row(GitHubTable, userID, date) {
            it[GitHubTable.commits] = count
            it[GitHubTable.repos] = repos
        }

    private fun setCommits(userID: UUID, count: Long) = transaction {
        GitHubTable.update({ GitHubTable.userID eq userID }) { it[GitHubTable.commits] = count }
    }

    private fun steps(userID: UUID, count: Long, date: Long = todayStart) =
        row(AppleStepsTable, userID, date) { it[AppleStepsTable.steps] = count }

    private fun screenTime(userID: UUID, minutes: Long, date: Long) =
        row(ScreenTimeTable, userID, date) { it[ScreenTimeTable.minutes] = minutes }

    private suspend fun posts(viewer: UUID): List<FeedPostView> = feedFor(viewer, null, 50).posts

    private suspend fun syncNow(userID: UUID) = syncFeedPosts(userID, System.currentTimeMillis())

    // --- publishing

    @Test
    fun `syncing twice leaves one unchanged card`() = runBlocking {
        val (actor) = pair()
        commits(actor, 3)
        syncFeedPosts(actor, now)
        val first = posts(actor).single()
        syncFeedPosts(actor, now + 60_000)
        val second = posts(actor).single()
        assertEquals(first.id, second.id)
        assertEquals(first.lastActivityAt, second.lastActivityAt)
    }

    @Test
    fun `a card grows and rises without losing its likes`() = runBlocking {
        val (actor, viewer) = pair()
        commits(actor, 3)
        syncNow(actor)
        val card = posts(viewer).single()
        likePost(viewer, UUID.fromString(card.id))

        setCommits(actor, 7)
        Thread.sleep(5)
        syncNow(actor)

        val grown = posts(viewer).single()
        assertEquals(card.id, grown.id)
        assertEquals(7L, (grown.detail as GitHubDetail).commits)
        assertEquals(1L, grown.likeCount)
        assertTrue(grown.lastActivityAt > card.lastActivityAt)
    }

    @Test
    fun `a source without a goal does not post`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_steps", "steps", GoalPeriod.DAILY, 100)
        commits(user, 3)
        syncFeedPosts(user, now)
        assertTrue(posts(user).isEmpty())
    }

    @Test
    fun `a card goes away when its activity does`() = runBlocking {
        val (actor) = pair()
        commits(actor, 3)
        syncNow(actor)
        assertEquals(1, posts(actor).size)
        setCommits(actor, 0)
        syncNow(actor)
        assertTrue(posts(actor).isEmpty())
    }

    @Test
    fun `github names the busiest repos and sums the rest`() = runBlocking {
        val (actor) = pair()
        val repos =
            """[{"repo":"a/one","commits":4},{"repo":"a/two","commits":3},""" +
                """{"repo":"a/three","commits":2},{"repo":"a/four","commits":1}]"""
        commits(actor, 150, repos = repos)
        syncFeedPosts(actor, now)
        val detail = posts(actor).single().detail as GitHubDetail
        assertEquals(listOf("a/one", "a/two", "a/three"), detail.repos.map { it.repo })
        assertEquals(141L, detail.otherCommits)
    }

    @Test
    fun `rows from before repos existed show only the count`() = runBlocking {
        val (actor) = pair()
        commits(actor, 5, repos = null)
        syncFeedPosts(actor, now)
        val detail = posts(actor).single().detail as GitHubDetail
        assertTrue(detail.repos.isEmpty())
        assertEquals(5L, detail.otherCommits)
    }

    // --- goal-met sources

    @Test
    fun `steps post only once a goal is met`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_steps", "steps", GoalPeriod.DAILY, 10_000)
        steps(user, 9_000)
        syncFeedPosts(user, now)
        assertTrue(posts(user).isEmpty())

        transaction { AppleStepsTable.update { it[AppleStepsTable.steps] = 10_500 } }
        syncFeedPosts(user, now)
        assertEquals(1, posts(user).size)
    }

    @Test
    fun `a weekly goal posts on the day it is crossed, not the days after`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_steps", "steps", GoalPeriod.WEEKLY, 10_000)
        val monday = LocalDate.of(2026, 11, 2).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        val tuesdayNoon = monday + DAY_MS + DAY_MS / 2
        steps(user, 6_000, monday)
        steps(user, 5_000, monday + DAY_MS)

        syncFeedPosts(user, tuesdayNoon)
        val card = posts(user).single()
        assertEquals("2026-11-03", card.day)
        assertEquals(11_000L, card.goals.single().value)
        assertTrue(card.goals.single().met)

        // A later day's steps don't post again now the goal's been reached.
        steps(user, 5_000, monday + 2 * DAY_MS)
        syncFeedPosts(user, tuesdayNoon + DAY_MS)
        assertEquals(1, posts(user).size)
    }

    @Test
    fun `daily and weekly goals on one metric each read their own window`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_steps", "steps", GoalPeriod.DAILY, 5_000)
        upsertGoal(user, "apple_steps", "steps", GoalPeriod.WEEKLY, 10_000)
        val monday = LocalDate.of(2026, 11, 2).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        steps(user, 6_000, monday)
        steps(user, 5_000, monday + DAY_MS)

        syncFeedPosts(user, monday + DAY_MS + DAY_MS / 2)

        val tuesday = posts(user).first { it.day == "2026-11-03" }
        assertEquals(5_000L, tuesday.goals.first { it.period == GoalPeriod.DAILY }.value)
        assertEquals(11_000L, tuesday.goals.first { it.period == GoalPeriod.WEEKLY }.value)
    }

    // --- screen time

    @Test
    fun `screen time does not post while the day is open`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "screen_time", "minutes", GoalPeriod.DAILY, 180)
        screenTime(user, 60, todayStart)
        syncFeedPosts(user, now)
        assertTrue(posts(user).isEmpty())
    }

    @Test
    fun `a day with no screen time data does not count as under the limit`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "screen_time", "minutes", GoalPeriod.DAILY, 180)
        syncFeedPosts(user, now)
        assertTrue(posts(user).isEmpty())
    }

    @Test
    fun `a finished day under the limit posts, and over it does not`() = runBlocking {
        val under = newUser()
        upsertGoal(under, "screen_time", "minutes", GoalPeriod.DAILY, 180)
        screenTime(under, 120, yesterdayStart)
        syncFeedPosts(under, now)
        assertEquals(1, posts(under).size)

        val over = newUser()
        upsertGoal(over, "screen_time", "minutes", GoalPeriod.DAILY, 180)
        screenTime(over, 240, yesterdayStart)
        syncFeedPosts(over, now)
        assertTrue(posts(over).isEmpty())
    }

    // --- workouts

    @Test
    fun `each workout gets a card, and deleting one removes it`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 4)
        val run = addWorkout(user, WorkoutType.RUN, 30, 300, System.currentTimeMillis())
        addWorkout(user, WorkoutType.BASKETBALL, 45, 400, System.currentTimeMillis())
        syncNow(user)
        assertEquals(2, posts(user).size)

        val id = UUID.fromString(run.id)
        removeWorkout(user, id)
        deleteWorkoutPost(user, id)
        syncNow(user)
        assertEquals(WorkoutType.BASKETBALL, (posts(user).single().detail as WorkoutDetail).workoutType)
    }

    /** A fixed Monday to build each week's workouts from, UTC. */
    private val monday = LocalDate.of(2026, 11, 2).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
    private val hour = DAY_MS / 24

    private suspend fun workoutProgress(user: UUID, metric: String = "workouts"): Map<WorkoutType?, Long> =
        posts(user).associate { post ->
            (post.detail as WorkoutDetail).workoutType to post.goals.single { it.metric == metric }.value
        }

    @Test
    fun `each workout shows the week as of that workout`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 5)
        val tuesday = monday + DAY_MS
        addWorkout(user, WorkoutType.PICKLEBALL, 30, 100, monday + 8 * hour)
        addWorkout(user, WorkoutType.RUN, 30, 100, tuesday + 8 * hour)
        addWorkout(user, WorkoutType.WEIGHTLIFTING, 30, 100, tuesday + 20 * hour)

        syncFeedPosts(user, tuesday + 21 * hour)

        assertEquals(
            mapOf<WorkoutType?, Long>(
                WorkoutType.PICKLEBALL to 1L,
                WorkoutType.RUN to 2L,
                WorkoutType.WEIGHTLIFTING to 3L,
            ),
            workoutProgress(user),
        )
    }

    @Test
    fun `calories add up workout by workout, and only the one reaching the goal is met`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_fitness", "calories", GoalPeriod.DAILY, 500)
        addWorkout(user, WorkoutType.RUN, 30, 300, monday + 8 * hour)
        addWorkout(user, WorkoutType.WEIGHTLIFTING, 30, 300, monday + 20 * hour)

        syncFeedPosts(user, monday + 21 * hour)

        val goals = posts(user).associate { (it.detail as WorkoutDetail).workoutType to it.goals.single() }
        assertEquals(300L, goals.getValue(WorkoutType.RUN).value)
        assertFalse(goals.getValue(WorkoutType.RUN).met)
        assertEquals(600L, goals.getValue(WorkoutType.WEIGHTLIFTING).value)
        assertTrue(goals.getValue(WorkoutType.WEIGHTLIFTING).met)
    }

    @Test
    fun `workouts at the same moment still number one by one`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 5)
        addWorkout(user, WorkoutType.RUN, 30, 100, monday + 8 * hour)
        addWorkout(user, WorkoutType.BASKETBALL, 30, 100, monday + 8 * hour)

        syncFeedPosts(user, monday + 9 * hour)

        assertEquals(setOf(1L, 2L), workoutProgress(user).values.toSet())
    }

    @Test
    fun `a workout logged late renumbers the cards after it`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 5)
        val tuesday = monday + DAY_MS
        addWorkout(user, WorkoutType.RUN, 30, 100, tuesday + 8 * hour)
        syncFeedPosts(user, tuesday + 9 * hour)
        assertEquals(1L, workoutProgress(user).getValue(WorkoutType.RUN))

        addWorkout(user, WorkoutType.PICKLEBALL, 30, 100, monday + 8 * hour)
        syncFeedPosts(user, tuesday + 10 * hour)

        assertEquals(
            mapOf<WorkoutType?, Long>(WorkoutType.PICKLEBALL to 1L, WorkoutType.RUN to 2L),
            workoutProgress(user),
        )
    }

    @Test
    fun `a card past the lookback keeps its number`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 5)
        addWorkout(user, WorkoutType.RUN, 30, 100, monday + 8 * hour)
        syncFeedPosts(user, monday + 9 * hour)

        // Three days on, an earlier-in-the-week workout turns up. Monday's card has settled.
        addWorkout(user, WorkoutType.PICKLEBALL, 30, 100, monday + 7 * hour)
        addWorkout(user, WorkoutType.BASKETBALL, 30, 100, monday + 3 * DAY_MS)
        syncFeedPosts(user, monday + 3 * DAY_MS + hour)

        val progress = workoutProgress(user)
        assertEquals(1L, progress.getValue(WorkoutType.RUN))
        assertEquals(3L, progress.getValue(WorkoutType.BASKETBALL))
    }

    @Test
    fun `manual workouts are marked, and count the same as imported ones`() = runBlocking {
        val (actor, viewer) = pair(integration = "apple_fitness", metric = "workouts")
        // Both after the join, or the viewer wouldn't be allowed to see them.
        importWorkouts(
            actor,
            listOf(ImportedWorkout("hk-1", WorkoutType.RUN, 30, 300, System.currentTimeMillis())),
        )
        Thread.sleep(5)
        addWorkout(actor, WorkoutType.WEIGHTLIFTING, 30, 300, System.currentTimeMillis())
        Thread.sleep(5)
        syncNow(actor)

        val cards = posts(viewer).associateBy { (it.detail as WorkoutDetail).workoutType }
        val imported = cards.getValue(WorkoutType.RUN)
        val manual = cards.getValue(WorkoutType.WEIGHTLIFTING)
        assertFalse((imported.detail as WorkoutDetail).manual)
        assertTrue((manual.detail as WorkoutDetail).manual)
        assertEquals(1L, imported.goals.single().value)
        assertEquals(2L, manual.goals.single().value)

        // Turning details off doesn't hide that it was logged by hand.
        updateFeedDetails(actor, false)
        val hidden = posts(viewer).map { it.detail as WorkoutDetail }
        assertTrue(hidden.all { it.workoutType == null })
        assertEquals(1, hidden.count { it.manual })
    }

    @Test
    fun `an old workout does not post`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 4)
        addWorkout(user, WorkoutType.RUN, 30, 300, System.currentTimeMillis() - 3 * DAY_MS)
        syncNow(user)
        assertTrue(posts(user).isEmpty())
    }

    // --- who sees what

    @Test
    fun `someone outside the competition sees nothing`() = runBlocking {
        val (actor) = pair()
        commits(actor, 3)
        syncNow(actor)
        assertTrue(posts(newUser()).isEmpty())
    }

    @Test
    fun `leaving a competition stops sharing immediately`() = runBlocking {
        val (actor, viewer, competition) = pair()
        commits(actor, 3)
        syncNow(actor)
        assertEquals(1, posts(viewer).size)
        leaveCompetition(viewer, competition)
        assertTrue(posts(viewer).isEmpty())
    }

    @Test
    fun `cards from before someone joined stay hidden from them`() = runBlocking {
        val (actor, _, competition) = pair()
        commits(actor, 3)
        syncNow(actor)
        Thread.sleep(5)
        val late = newUser()
        joinCompetition(late, competition)
        assertTrue(posts(late).isEmpty())
    }

    @Test
    fun `a source the competition has no goal on stays private`() = runBlocking {
        val (actor, viewer) = pair(integration = "apple_steps", metric = "steps", target = 100)
        upsertGoal(actor, "github", "commits", GoalPeriod.WEEKLY, 1)
        commits(actor, 3)
        syncNow(actor)
        assertEquals(1, posts(actor).size)
        assertTrue(posts(viewer).isEmpty())
    }

    @Test
    fun `personal goal chips are only shown to their owner`() = runBlocking {
        val (actor, viewer, competition) = pair()
        upsertGoal(actor, "github", "commits", GoalPeriod.DAILY, 1)
        commits(actor, 3)
        syncNow(actor)

        assertEquals(2, posts(actor).single().goals.size)
        val seen = posts(viewer).single().goals.single()
        assertEquals("Rivals", seen.competitionName)
        assertEquals(competition.toString(), seen.competitionID)
        assertEquals(GoalPeriod.WEEKLY, seen.period)
    }

    @Test
    fun `a card earned by a private goal does not reach competition members`() = runBlocking {
        val (actor, viewer) =
            pair(integration = "apple_steps", metric = "steps", period = GoalPeriod.DAILY, target = 20_000)
        upsertGoal(actor, "apple_steps", "steps", GoalPeriod.DAILY, 5_000)
        steps(actor, 10_000)
        syncNow(actor)
        assertEquals(1, posts(actor).size)
        assertTrue(posts(viewer).isEmpty())

        transaction { AppleStepsTable.update { it[AppleStepsTable.steps] = 25_000 } }
        syncNow(actor)
        assertEquals(1, posts(viewer).size)
    }

    @Test
    fun `turning details off leaves others only the totals`() = runBlocking {
        val (actor, viewer) = pair()
        commits(actor, 3, repos = """[{"repo":"a/secret","commits":3}]""")
        syncNow(actor)
        assertEquals("a/secret", (posts(viewer).single().detail as GitHubDetail).repos.single().repo)

        updateFeedDetails(actor, false)

        val theirs = posts(viewer).single().detail as GitHubDetail
        assertTrue(theirs.repos.isEmpty())
        assertEquals(3L, theirs.commits)
        assertEquals(3L, theirs.otherCommits)
        // The owner still sees their own.
        assertEquals(1, (posts(actor).single().detail as GitHubDetail).repos.size)
    }

    @Test
    fun `turning details off hides what a workout was`() = runBlocking {
        val (actor, viewer) = pair(integration = "apple_fitness", metric = "workouts")
        addWorkout(actor, WorkoutType.RUN, 30, 300, System.currentTimeMillis())
        syncNow(actor)
        updateFeedDetails(actor, false)
        val detail = posts(viewer).single().detail as WorkoutDetail
        assertNull(detail.workoutType)
        assertNull(detail.durationMin)
        assertNull(detail.calories)
    }

    // --- likes

    @Test
    fun `liking is idempotent`() = runBlocking {
        val (actor, viewer) = pair()
        commits(actor, 3)
        syncNow(actor)
        val id = UUID.fromString(posts(viewer).single().id)

        assertEquals(1L, likePost(viewer, id).likes.likeCount)
        assertEquals(1L, likePost(viewer, id).likes.likeCount)
        assertTrue(posts(viewer).single().likedByMe)
        assertFalse(posts(actor).single().likedByMe)

        assertEquals(0L, unlikePost(viewer, id).likeCount)
        assertEquals(0L, unlikePost(viewer, id).likeCount)
    }

    @Test
    fun `only the first like of a card notifies, even after unliking`() = runBlocking {
        val (actor, viewer) = pair()
        commits(actor, 3)
        syncNow(actor)
        val id = UUID.fromString(posts(viewer).single().id)

        assertTrue(likePost(viewer, id).firstLike)
        assertFalse(likePost(viewer, id).firstLike)
        unlikePost(viewer, id)
        assertFalse(likePost(viewer, id).firstLike)
    }

    @Test
    fun `a card you can't see can't be liked`() = runBlocking {
        val (actor) = pair()
        commits(actor, 3)
        syncNow(actor)
        val id = UUID.fromString(posts(actor).single().id)
        val stranger = newUser()

        assertEquals(404, assertFailsWith<Error> { likePost(stranger, id) }.statusCode)
        assertEquals(404, assertFailsWith<Error> { unlikePost(stranger, id) }.statusCode)
        assertEquals(404, assertFailsWith<Error> { likePost(stranger, UUID.randomUUID()) }.statusCode)
    }

    @Test
    fun `you can't like your own card`() = runBlocking {
        val (actor) = pair()
        commits(actor, 3)
        syncNow(actor)
        val id = UUID.fromString(posts(actor).single().id)
        assertEquals(400, assertFailsWith<Error> { likePost(actor, id) }.statusCode)
    }

    // --- over HTTP, with the real JSON and status codes

    private suspend fun HttpClient.register(username: String): String =
        post("/api/auth/register") {
                contentType(ContentType.Application.Json)
                setBody(RegisterRequest(username, "$username@example.com", "hunter2pass"))
            }
            .body<TokenResponse>()
            .accessToken

    private suspend fun HttpClient.feed(token: String): List<JsonObject> =
        Json.parseToJsonElement(get("/api/feed") { bearerAuth(token) }.bodyAsText())
            .jsonObject
            .getValue("posts")
            .jsonArray
            .map { it.jsonObject }

    @Test
    fun `a logged workout reaches a competitor, who can like it`() = testApplication {
        application { configureModule() }
        val client = createClient {
            install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        }
        val actor = client.register("actor")
        val viewer = client.register("viewer")
        val stranger = client.register("stranger")
        val actorID =
            UUID.fromString(client.get("/api/user") { bearerAuth(actor) }.body<SelfResponse>().userID)
        val viewerID =
            UUID.fromString(client.get("/api/user") { bearerAuth(viewer) }.body<SelfResponse>().userID)
        val competition = createCompetition(actorID, "Rivals").id
        joinCompetition(viewerID, competition)
        upsertCompetitionGoal(competition, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 4)
        Thread.sleep(5)

        val created =
            client.post("/api/integrations/apple_fitness/workouts") {
                bearerAuth(actor)
                contentType(ContentType.Application.Json)
                setBody("""{"type":"RUN","durationMin":30,"calories":300}""")
            }
        assertEquals(HttpStatusCode.Created, created.status)
        val workoutID =
            Json.parseToJsonElement(created.bodyAsText()).jsonObject.getValue("id").jsonPrimitive.content

        val card = client.feed(viewer).single()
        val detail = card.getValue("detail").jsonObject
        assertEquals("apple_fitness", detail.getValue("type").jsonPrimitive.content)
        assertEquals("RUN", detail.getValue("workoutType").jsonPrimitive.content)
        val id = card.getValue("id").jsonPrimitive.content

        assertEquals(HttpStatusCode.NotFound, client.put("/api/feed/$id/like") { bearerAuth(stranger) }.status)
        assertEquals(HttpStatusCode.BadRequest, client.put("/api/feed/$id/like") { bearerAuth(actor) }.status)
        val liked = client.put("/api/feed/$id/like") { bearerAuth(viewer) }
        assertEquals(HttpStatusCode.OK, liked.status)
        assertTrue(liked.bodyAsText().contains("\"likedByMe\""))
        assertEquals("1", client.feed(actor).single().getValue("likeCount").jsonPrimitive.content)
        assertEquals(HttpStatusCode.OK, client.delete("/api/feed/$id/like") { bearerAuth(viewer) }.status)

        // Turning details off shows through to the competitor straight away.
        val off =
            client.put("/api/user/feed-details") {
                bearerAuth(actor)
                contentType(ContentType.Application.Json)
                setBody("""{"enabled":false}""")
            }
        assertEquals(HttpStatusCode.NoContent, off.status)
        assertFalse(client.get("/api/user") { bearerAuth(actor) }.body<SelfResponse>().feedDetails)
        val hidden = client.feed(viewer).single().getValue("detail").jsonObject
        assertEquals("null", hidden.getValue("workoutType").toString())

        val removed =
            client.delete("/api/integrations/apple_fitness/workouts/$workoutID") { bearerAuth(actor) }
        assertEquals(HttpStatusCode.NoContent, removed.status)
        assertTrue(client.feed(viewer).isEmpty())
    }

    // --- paging

    @Test
    fun `paging walks every card once, newest first`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 4)
        repeat(5) { i -> addWorkout(user, WorkoutType.RUN, 30, 300, System.currentTimeMillis() - i * 1000L) }
        syncNow(user)

        val first = feedFor(user, null, 2)
        val second = feedFor(user, FeedCursor.parse(first.nextCursor!!), 2)
        val third = feedFor(user, FeedCursor.parse(second.nextCursor!!), 2)
        assertNull(third.nextCursor)

        val all = first.posts + second.posts + third.posts
        assertEquals(5, all.distinctBy { it.id }.size)
        assertEquals(all.map { it.lastActivityAt }.sortedDescending(), all.map { it.lastActivityAt })
    }

    @Test
    fun `a card is dated with its owner's local day`() = runBlocking {
        val (actor) = pair()
        commits(actor, 3)
        syncFeedPosts(actor, now)
        val expected = Instant.ofEpochMilli(now).atZone(ZoneOffset.UTC).toLocalDate().toString()
        assertEquals(expected, posts(actor).single().day)
    }
}
