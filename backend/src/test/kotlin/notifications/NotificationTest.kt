package com.accountable.notifications

import features.competition.CompetitionGoals
import features.competition.CompetitionMembers
import features.competition.Competitions
import features.competition.createCompetition
import features.competition.joinCompetition
import features.competition.upsertCompetitionGoal
import features.goals.GoalPeriod
import features.goals.Goals
import features.goals.MS_PER_DAY
import features.goals.upsertGoal
import features.habits.HabitCheckins
import features.habits.HabitColor
import features.habits.Habits
import features.habits.createHabit
import features.habits.setCheckin
import integrations.AppleStepsTable
import integrations.GitHubTable
import integrations.api.UserIntegrations
import integrations.api.startOfUtcDay
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking
import notifications.NotificationKind
import notifications.NotificationOptOuts
import notifications.NotificationWorker
import notifications.PushDevices
import notifications.competitionRecaps
import notifications.goalsStatus
import notifications.setEnabled
import notifications.streakRisk
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.upsert
import user.Users
import user.createUser

/**
 * What the scheduled notifications say and when they're due. Users are in UTC so day starts are
 * exact. `now` is Wed 2024-01-10 17:00 UTC; the week before ran Mon 2024-01-01 to Sun 2024-01-07.
 */
class NotificationTest {
    private val now = Instant.parse("2024-01-10T17:00:00Z").toEpochMilli()
    private val today = startOfUtcDay(now)
    private val todayDate = LocalDate.of(2024, 1, 10)

    @BeforeTest
    fun setupDb() {
        Database.connect(
            url = "jdbc:h2:mem:notification-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(
                Users,
                UserIntegrations,
                Goals,
                Habits,
                HabitCheckins,
                Competitions,
                CompetitionMembers,
                CompetitionGoals,
                PushDevices,
                NotificationOptOuts,
                GitHubTable,
                AppleStepsTable,
            )
            NotificationOptOuts.deleteAll()
            PushDevices.deleteAll()
            CompetitionGoals.deleteAll()
            CompetitionMembers.deleteAll()
            Competitions.deleteAll()
            HabitCheckins.deleteAll()
            Habits.deleteAll()
            Goals.deleteAll()
            AppleStepsTable.deleteAll()
            GitHubTable.deleteAll()
            UserIntegrations.deleteAll()
            Users.deleteAll()
        }
    }

    private fun newUser(name: String = "u${UUID.randomUUID().toString().take(8)}"): UUID =
        createUser(name, "${UUID.randomUUID()}@e.com", "hash", "UTC").id

    /** Record [steps] on the day [offset] days from today (negative = past). */
    private fun seedSteps(userID: UUID, offset: Int, steps: Long) = transaction {
        AppleStepsTable.upsert {
            it[AppleStepsTable.userID] = userID
            it[date] = today + offset * MS_PER_DAY
            it[AppleStepsTable.steps] = steps
        }
    }

    @Test
    fun `goals status lists what's left today`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_steps", "steps", GoalPeriod.DAILY, 10_000)
        upsertGoal(user, "github", "commits", GoalPeriod.WEEKLY, 5)
        createHabit(user, "Read", HabitColor.LIME)
        seedSteps(user, 0, 6_900)

        val push = goalsStatus(user, now)!!
        assertEquals("/goals", push.path)
        assertEquals(
            // Newest goal first, as the app lists them.
            "0 of 2 goals on track. Still to go: 5 commits this week and 3,100 more steps. " +
                "Habits left: Read.",
            push.body,
        )
    }

    @Test
    fun `goals status celebrates a finished day`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_steps", "steps", GoalPeriod.DAILY, 10_000)
        val habit = createHabit(user, "Read", HabitColor.LIME)
        setCheckin(user, habit.id, todayDate, true)
        seedSteps(user, 0, 10_500)

        assertEquals("Everything's on track today. Nice work.", goalsStatus(user, now)!!.body)
    }

    @Test
    fun `goals status is skipped with nothing to report`() = runBlocking {
        assertNull(goalsStatus(newUser(), now))
    }

    @Test
    fun `streak risk names the streaks that end tonight`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_steps", "steps", GoalPeriod.DAILY, 10_000)
        (-3..-1).forEach { seedSteps(user, it, 12_000) }
        seedSteps(user, 0, 4_000)
        val habit = createHabit(user, "Read", HabitColor.LIME)
        setCheckin(user, habit.id, todayDate.minusDays(1), true)
        setCheckin(user, habit.id, todayDate.minusDays(2), true)

        assertEquals(
            "Your 3-day goal streak ends at midnight: 6,000 more steps to go. " +
                "Read (2 days) isn't done yet today.",
            streakRisk(user, now)!!.body,
        )
    }

    @Test
    fun `streak risk stays quiet once today is done`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_steps", "steps", GoalPeriod.DAILY, 10_000)
        (-3..0).forEach { seedSteps(user, it, 12_000) }

        assertNull(streakRisk(user, now))
    }

    @Test
    fun `competition recap ranks last week`() = runBlocking {
        val winner = newUser("winner")
        val other = newUser("other")
        val competition = createCompetition(winner, "Steps")
        joinCompetition(other, competition.id)
        upsertCompetitionGoal(competition.id, "apple_steps", "steps", GoalPeriod.DAILY, 1_000)
        // Mon–Sun of last week: today (Wed) is offset 0, so last Monday is -9.
        (-9..-3).forEach { seedSteps(winner, it, 1_000) }

        assertEquals(
            "You won last week with 1 of 1 goals hit.",
            competitionRecaps(winner, now).single().body,
        )
        val recap = competitionRecaps(other, now).single()
        assertEquals("/competition/${competition.id}", recap.path)
        assertEquals(
            "You finished 2nd of 2 with 0 of 1 goals hit. winner took 1st with 1.",
            recap.body,
        )
    }

    @Test
    fun `competition recap skips a competition with no one to beat`() = runBlocking {
        val user = newUser()
        val competition = createCompetition(user, "Solo")
        upsertCompetitionGoal(competition.id, "apple_steps", "steps", GoalPeriod.DAILY, 1_000)

        assertTrue(competitionRecaps(user, now).isEmpty())
    }

    @Test
    fun `notifications go out at their local hour unless switched off`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "apple_steps", "steps", GoalPeriod.DAILY, 10_000)

        assertEquals("Goals check-in", NotificationWorker.pushesDue(user, now).single().title)
        assertTrue(NotificationWorker.pushesDue(user, now - 5 * 60 * 60 * 1000).isEmpty())

        setEnabled(user, mapOf(NotificationKind.GOALS_STATUS to false))
        assertTrue(NotificationWorker.pushesDue(user, now).isEmpty())
    }
}
