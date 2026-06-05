package com.accountable.features

import features.goals.Goal
import features.goals.GoalPeriod
import features.goals.Goals
import features.goals.MS_PER_DAY
import features.goals.currentWindow
import features.goals.metricByDay
import features.goals.perDayValues
import features.goals.progressFor
import features.goals.sumInRange
import features.goals.sumMetric
import features.goals.upsertGoal
import features.streak.DayStatus
import features.streak.streakFor
import features.streak.streakHistory
import integrations.GitHubTable
import integrations.LeetCodeTable
import integrations.api.startOfUtcDay
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.transactions.transaction
import user.Users
import user.createUser
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Unit tests for the streak/goal aggregation math. These exercise the in-memory aggregation path
 * ([metricByDay] + [sumInRange]) that replaced the per-day SQL queries, pinning the day/week window
 * semantics so the optimization can't silently drift from the original behavior.
 *
 * All users are created in UTC so day starts are exact (no DST), letting day offsets be computed by
 * plain millisecond arithmetic. `now` is fixed at Wed 2024-01-10 12:00 UTC; 2024-01-01 and
 * 2024-01-08 are both Mondays, so offset -9 is the Monday two weeks back.
 */
class StreakTest {

    private val now = Instant.parse("2024-01-10T12:00:00Z").toEpochMilli()
    private val today = startOfUtcDay(now)

    /** Start-of-day epoch [offset] days from today (negative = past). Exact in UTC. */
    private fun dayStart(offset: Int): Long = today + offset * MS_PER_DAY

    @BeforeTest
    fun setupDb() {
        Database.connect(
            url = "jdbc:h2:mem:streak-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, Goals, GitHubTable, LeetCodeTable)
            GitHubTable.deleteAll()
            LeetCodeTable.deleteAll()
            Goals.deleteAll()
            Users.deleteAll()
        }
    }

    private fun newUser(): UUID =
        createUser("u${UUID.randomUUID().toString().take(8)}", "${UUID.randomUUID()}@e.com", "hash", "UTC").id

    private fun seedGithub(userID: UUID, offset: Int, commits: Long) = transaction {
        GitHubTable.insert {
            it[GitHubTable.userID] = userID
            it[date] = dayStart(offset)
            it[GitHubTable.commits] = commits
        }
    }

    private fun seedLeetEasy(userID: UUID, offset: Int, easy: Long) = transaction {
        LeetCodeTable.insert {
            it[LeetCodeTable.userID] = userID
            it[date] = dayStart(offset)
            it[LeetCodeTable.easy] = easy
            it[medium] = 0
            it[hard] = 0
        }
    }

    private fun dailyCommitGoal(userID: UUID, target: Long = 1) =
        Goal(userID, "github", "commits", GoalPeriod.DAILY, target, now)

    private fun weeklyEasyGoal(userID: UUID, target: Long) =
        Goal(userID, "leetcode", "easy", GoalPeriod.WEEKLY, target, now)

    // --- pure helpers ---

    @Test
    fun `sumInRange sums only keys in the half-open window`() {
        val map = mapOf(0L to 1L, 100L to 2L, 200L to 4L, 300L to 8L)
        assertEquals(6L, map.sumInRange(100L, 300L)) // 100 and 200, not 300
        assertEquals(0L, map.sumInRange(400L, 500L))
        assertEquals(15L, map.sumInRange(0L, 301L))
    }

    @Test
    fun `currentWindow daily is the calendar day`() {
        val (start, end) = currentWindow(GoalPeriod.DAILY, now, ZoneOffset.UTC)
        assertEquals(today, start)
        assertEquals(today + MS_PER_DAY, end)
    }

    @Test
    fun `currentWindow weekly starts on Monday`() {
        val (start, end) = currentWindow(GoalPeriod.WEEKLY, now, ZoneOffset.UTC)
        assertEquals(dayStart(-2), start) // Mon 2024-01-08
        assertEquals(dayStart(5), end) // Mon 2024-01-15
    }

    // --- metricByDay ---

    @Test
    fun `metricByDay buckets each day and omits absent days`() = runBlocking {
        val user = newUser()
        seedGithub(user, -1, 3)
        seedGithub(user, 0, 5)
        val map = metricByDay(user, dailyCommitGoal(user), dayStart(-2), dayStart(1))
        assertEquals(mapOf(dayStart(-1) to 3L, today to 5L), map)
    }

    @Test
    fun `metricByDay is empty for an unregistered metric`() = runBlocking {
        val user = newUser()
        val bogus = Goal(user, "github", "nope", GoalPeriod.DAILY, 1, now)
        assertEquals(emptyMap(), metricByDay(user, bogus, dayStart(-7), dayStart(1)))
    }

    // --- sumMetric / progressFor ---

    @Test
    fun `sumMetric and progressFor agree on the current daily window`() = runBlocking {
        val user = newUser()
        seedGithub(user, 0, 4)
        seedGithub(user, -1, 9) // outside today's window
        val goal = dailyCommitGoal(user)
        assertEquals(4L, sumMetric(user, goal, today, today + MS_PER_DAY))
        assertEquals(4L, progressFor(user, goal, now))
    }

    @Test
    fun `progressFor on a weekly goal sums the whole week`() = runBlocking {
        val user = newUser()
        // current week is Mon -2 .. Sun +4; seed three days inside it
        seedLeetEasy(user, -2, 1)
        seedLeetEasy(user, -1, 2)
        seedLeetEasy(user, 0, 3)
        assertEquals(6L, progressFor(user, weeklyEasyGoal(user, target = 5), now))
    }

    // --- perDayValues ---

    @Test
    fun `perDayValues returns oldest-first with zeros for missing days`() = runBlocking {
        val user = newUser()
        seedGithub(user, 0, 5)
        seedGithub(user, -2, 2)
        val vals = perDayValues(user, dailyCommitGoal(user), days = 4, now = now)
        // offsets -3, -2, -1, 0
        assertEquals(listOf(0L, 2L, 0L, 5L), vals)
    }

    // --- streakFor: daily ---

    @Test
    fun `streakFor counts consecutive passing days and stops at the first miss`() = runBlocking {
        val user = newUser()
        for (offset in 0 downTo -4) seedGithub(user, offset, 1) // today..-4 pass, -5 absent
        assertEquals(5, streakFor(user, listOf(dailyCommitGoal(user)), now))
    }

    @Test
    fun `streakFor breaks immediately when today misses the target`() = runBlocking {
        val user = newUser()
        seedGithub(user, 0, 1)
        seedGithub(user, -1, 5)
        assertEquals(0, streakFor(user, listOf(dailyCommitGoal(user, target = 2)), now))
    }

    @Test
    fun `streakFor returns 0 for no goals`() = runBlocking {
        assertEquals(0, streakFor(newUser(), emptyList(), now))
    }

    @Test
    fun `streakFor stops once the day dips below the floor`() = runBlocking {
        val user = newUser()
        for (offset in 0 downTo -9) seedGithub(user, offset, 1)
        // floor at the start of -5 keeps offsets 0..-5 (6 days) and rejects -6
        val streak = streakFor(user, listOf(dailyCommitGoal(user)), now, floor = dayStart(-5))
        assertEquals(6, streak)
    }

    // --- streakFor: weekly interaction ---

    @Test
    fun `streakFor never breaks on the in-progress current week`() = runBlocking {
        val user = newUser()
        // daily passes for the whole current week, weekly goal has zero progress this week
        for (offset in 0 downTo -2) seedGithub(user, offset, 1) // Wed..Mon of current week
        val goals = listOf(dailyCommitGoal(user), weeklyEasyGoal(user, target = 100))
        // -3 (Sun, previous week) has no commits -> daily miss ends it; current week not penalized
        assertEquals(3, streakFor(user, goals, now))
    }

    @Test
    fun `streakFor counts through a completed week that met its weekly target`() = runBlocking {
        val user = newUser()
        for (offset in 0 downTo -9) seedGithub(user, offset, 1) // daily passes -9..0
        for (offset in -9..-3) seedLeetEasy(user, offset, 1) // previous week sum = 7
        val goals = listOf(dailyCommitGoal(user), weeklyEasyGoal(user, target = 5))
        // walks 0..-9 (10 days); -10 has no commits -> daily miss
        assertEquals(10, streakFor(user, goals, now))
    }

    @Test
    fun `streakFor breaks at a completed week that missed its weekly target`() = runBlocking {
        val user = newUser()
        for (offset in 0 downTo -9) seedGithub(user, offset, 1)
        for (offset in -9..-6) seedLeetEasy(user, offset, 1) // previous week sum = 4 < 5
        val goals = listOf(dailyCommitGoal(user), weeklyEasyGoal(user, target = 5))
        // current week days (0,-1,-2) pass; -3 enters the failed previous week -> stop at 3
        assertEquals(3, streakFor(user, goals, now))
    }

    // --- streakHistory ---

    @Test
    fun `streakHistory reports per-day status oldest first with today as TODAY`() = runBlocking {
        val user = newUser()
        runBlocking { upsertGoal(user, "github", "commits", GoalPeriod.DAILY, 1) }
        seedGithub(user, 0, 1)
        seedGithub(user, -1, 1)
        seedGithub(user, -2, 1)
        // offsets -4,-3,-2,-1,0
        val history = streakHistory(user, days = 5, now = now)
        assertEquals(
            listOf(
                DayStatus.MISS,
                DayStatus.MISS,
                DayStatus.ON,
                DayStatus.ON,
                DayStatus.TODAY,
            ),
            history,
        )
    }

    @Test
    fun `streakHistory is all NONE when the user has no goals`() = runBlocking {
        val history = streakHistory(newUser(), days = 3, now = now)
        assertEquals(List(3) { DayStatus.NONE }, history)
    }
}
