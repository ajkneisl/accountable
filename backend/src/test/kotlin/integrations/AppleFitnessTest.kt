package com.accountable.integrations

import features.competition.CompetitionGoal
import features.goals.Goal
import features.goals.GoalPeriod
import features.goals.metricByDay
import features.goals.sumMetric
import integrations.AppleFitness
import integrations.AppleFitnessTable
import integrations.AppleFitnessWorkouts
import integrations.AppleHealthImports
import integrations.ImportedWorkout
import integrations.WorkoutType
import integrations.addWorkout
import integrations.importWorkouts
import integrations.removeWorkout
import integrations.api.UserIntegrations
import integrations.api.startOfDay
import integrations.rebuildAppleFitnessRollup
import integrations.workoutsForDay
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.transactions.transaction
import user.RefreshTokens
import user.Users

class AppleFitnessTest {
    private val testUserID = UUID.randomUUID()
    private val zone = ZoneId.of("America/Chicago")

    /** 2026-06-23 22:00 in Chicago — which is 2026-06-24 03:00 UTC, i.e. a different UTC day. */
    private val lateEveningLocal =
        LocalDateTime.of(2026, 6, 23, 22, 0).atZone(zone).toInstant().toEpochMilli()

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:apple-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(
                Users,
                RefreshTokens,
                UserIntegrations,
                AppleFitnessWorkouts,
                AppleHealthImports,
                AppleFitnessTable,
            )
            AppleHealthImports.deleteAll()
            AppleFitnessTable.deleteAll()
            AppleFitnessWorkouts.deleteAll()
            UserIntegrations.deleteAll()
            RefreshTokens.deleteAll()
            Users.deleteAll()

            Users.insert {
                it[id] = testUserID
                it[username] = "alice"
                it[email] = "alice@example.com"
                it[password] = "x"
                it[createdAt] = System.currentTimeMillis()
                it[timezone] = "America/Chicago"
            }
        }
    }

    @Test
    fun `workout buckets by local day, not the UTC day`() = runBlocking {
        addWorkout(testUserID, WorkoutType.RUN, durationMin = 30, calories = 100, happenedAt = lateEveningLocal)

        // It belongs to the Chicago day (Jun 23), not the UTC day the instant falls in (Jun 24).
        val localDay = AppleFitness.getDay(testUserID, lateEveningLocal)
        assertEquals(startOfDay(lateEveningLocal, zone), localDay?.data?.date)
        assertEquals(1L, localDay?.data?.workouts)
        assertEquals(100L, localDay?.data?.calories)

        // The next UTC midnight (still the same Chicago day) must not see it as a separate day.
        val nextUtcDay = lateEveningLocal + 6 * 60 * 60 * 1000 // ~Jun 24 09:00 UTC = Jun 24 04:00 CDT
        val other = AppleFitness.getDay(testUserID, nextUtcDay)
        assertEquals(null, other)
    }

    @Test
    fun `workoutsForDay returns the workout under its local day`() = runBlocking {
        addWorkout(testUserID, WorkoutType.RUN, 30, 100, lateEveningLocal)
        val list = workoutsForDay(testUserID, lateEveningLocal)
        assertEquals(1, list.size)
        assertEquals(100L, list[0].calories)
    }

    @Test
    fun `rebuild recomputes the rollup from events by local day`() = runBlocking {
        addWorkout(testUserID, WorkoutType.WEIGHTLIFTING, 45, 200, lateEveningLocal)
        val nextDay = lateEveningLocal + 24 * 60 * 60 * 1000
        addWorkout(testUserID, WorkoutType.RUN, 30, 120, nextDay)

        // Corrupt the rollup, then rebuild from the underlying events.
        transaction { AppleFitnessTable.deleteAll() }
        rebuildAppleFitnessRollup(testUserID)

        assertEquals(200L, AppleFitness.getDay(testUserID, lateEveningLocal)?.data?.calories)
        assertEquals(120L, AppleFitness.getDay(testUserID, nextDay)?.data?.calories)
    }

    @Test
    fun `importing the same Apple Health workout twice adds it once`() = runBlocking {
        val run = ImportedWorkout("hk-1", WorkoutType.RUN, 30, 250, lateEveningLocal)
        assertEquals(1, importWorkouts(testUserID, listOf(run)))
        assertEquals(0, importWorkouts(testUserID, listOf(run, run)))

        val day = AppleFitness.getDay(testUserID, lateEveningLocal)
        assertEquals(1L, day?.data?.workouts)
        assertEquals(250L, day?.data?.calories)
        assertEquals(integrations.WorkoutSource.APPLE, workoutsForDay(testUserID, lateEveningLocal).single().source)
    }

    @Test
    fun `a deleted imported workout does not come back on resync`() = runBlocking {
        val run = ImportedWorkout("hk-2", WorkoutType.RUN, 30, 250, lateEveningLocal)
        importWorkouts(testUserID, listOf(run))
        val id = UUID.fromString(workoutsForDay(testUserID, lateEveningLocal).single().id)
        removeWorkout(testUserID, id)

        assertEquals(0, importWorkouts(testUserID, listOf(run)))
        assertEquals(0, workoutsForDay(testUserID, lateEveningLocal).size)
    }

    @Test
    fun `re-importing a workout corrects its type without duplicating it`() = runBlocking {
        importWorkouts(testUserID, listOf(ImportedWorkout("hk-3", WorkoutType.OTHER, 40, 300, lateEveningLocal)))

        val walk = ImportedWorkout("hk-3", WorkoutType.WALK, 40, 300, lateEveningLocal)
        assertEquals(1, importWorkouts(testUserID, listOf(walk)))
        assertEquals(0, importWorkouts(testUserID, listOf(walk)))

        val stored = workoutsForDay(testUserID, lateEveningLocal).single()
        assertEquals(WorkoutType.WALK, stored.type)
        assertEquals(1L, AppleFitness.getDay(testUserID, lateEveningLocal)?.data?.workouts)
    }

    @Test
    fun `a deleted imported workout stays deleted when re-sent with a new type`() = runBlocking {
        importWorkouts(testUserID, listOf(ImportedWorkout("hk-4", WorkoutType.OTHER, 40, 300, lateEveningLocal)))
        val id = UUID.fromString(workoutsForDay(testUserID, lateEveningLocal).single().id)
        removeWorkout(testUserID, id)

        val walk = ImportedWorkout("hk-4", WorkoutType.WALK, 40, 300, lateEveningLocal)
        assertEquals(0, importWorkouts(testUserID, listOf(walk)))
        assertEquals(0, workoutsForDay(testUserID, lateEveningLocal).size)
    }

    @Test
    fun `a minimum workout length only counts workouts that long`() = runBlocking {
        addWorkout(testUserID, WorkoutType.WALK, 20, 100, lateEveningLocal)
        addWorkout(testUserID, WorkoutType.RUN, 30, 300, lateEveningLocal)
        addWorkout(testUserID, WorkoutType.SWIM, 45, 400, lateEveningLocal)
        val start = startOfDay(lateEveningLocal, zone)
        val end = start + 86_400_000

        val every = Goal(testUserID, "apple_fitness", "workouts", GoalPeriod.DAILY, 1, 0)
        val longOnes = every.copy(minWorkoutMin = 30)
        assertEquals(3L, sumMetric(testUserID, every, start, end))
        assertEquals(2L, sumMetric(testUserID, longOnes, start, end))
        assertEquals(mapOf(start to 2L), metricByDay(testUserID, longOnes, start, end))

        // Competition goals count the same way.
        val shared = CompetitionGoal(UUID.randomUUID(), "apple_fitness", "workouts", GoalPeriod.DAILY, 1, 0, 30)
        assertEquals(2L, sumMetric(testUserID, shared, start, end))

        // Calories ignore it: the minimum is only for counting workouts.
        val calories = longOnes.copy(metric = "calories")
        assertEquals(800L, sumMetric(testUserID, calories, start, end))
    }
}
