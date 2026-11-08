package com.accountable.features

import features.competition.CompetitionGoals
import features.competition.CompetitionMembers
import features.competition.Competitions
import features.competition.createCompetition
import features.competition.goalsForCompetition
import features.competition.upsertCompetitionGoal
import features.goals.GoalPeriod
import features.goals.weekValues
import features.goals.weekWindow
import integrations.AppleFitnessTable
import integrations.AppleFitnessWorkouts
import integrations.WorkoutType
import integrations.addWorkout
import integrations.api.UserIntegrations
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.Users
import user.createUser

class CompetitionGoalTest {
    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:competition-goal-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(
                Users,
                Competitions,
                CompetitionMembers,
                CompetitionGoals,
                UserIntegrations,
                AppleFitnessWorkouts,
                AppleFitnessTable,
            )
            AppleFitnessWorkouts.deleteAll()
            AppleFitnessTable.deleteAll()
            UserIntegrations.deleteAll()
            CompetitionGoals.deleteAll()
            CompetitionMembers.deleteAll()
            Competitions.deleteAll()
            Users.deleteAll()
        }
    }

    private fun newUser(): UUID =
        createUser("u${UUID.randomUUID().toString().take(8)}", "${UUID.randomUUID()}@e.com", "hash", "UTC").id

    @Test
    fun `editing a goal changes its target but keeps its place`() = runBlocking {
        val competition = createCompetition(newUser(), "Test").id
        val first = upsertCompetitionGoal(competition, "github", "commits", GoalPeriod.WEEKLY, 5)
        Thread.sleep(5)
        upsertCompetitionGoal(competition, "apple_steps", "steps", GoalPeriod.DAILY, 10_000)
        Thread.sleep(5)

        val edited = upsertCompetitionGoal(competition, "github", "commits", GoalPeriod.WEEKLY, 8)
        assertEquals(8L, edited.target)
        assertEquals(first.createdAt, edited.createdAt)
        assertEquals(
            listOf("apple_steps" to 10_000L, "github" to 8L),
            goalsForCompetition(competition).map { it.integration to it.target },
        )
    }

    @Test
    fun `a shared goal's minimum applies to members and can be edited`(): Unit = runBlocking {
        val member = newUser()
        val competition = createCompetition(member, "Test").id
        val now = System.currentTimeMillis()
        addWorkout(member, WorkoutType.WALK, 20, 100, now)
        addWorkout(member, WorkoutType.RUN, 40, 300, now)
        val zone = ZoneOffset.UTC
        val weekStart = weekWindow(now, zone, 0).first

        // Stored and read back the way the board reads it.
        upsertCompetitionGoal(competition, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 3, 30)
        var goal = goalsForCompetition(competition).single()
        assertEquals(30L, goal.minWorkoutMin)
        assertEquals(1L, weekValues(member, goal, weekStart, zone).sum())

        // Editing replaces it, and leaving it out removes the minimum.
        upsertCompetitionGoal(competition, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 3, 15)
        goal = goalsForCompetition(competition).single()
        assertEquals(2L, weekValues(member, goal, weekStart, zone).sum())

        upsertCompetitionGoal(competition, "apple_fitness", "workouts", GoalPeriod.WEEKLY, 3)
        goal = goalsForCompetition(competition).single()
        assertEquals(null, goal.minWorkoutMin)
        assertEquals(2L, weekValues(member, goal, weekStart, zone).sum())
    }
}
