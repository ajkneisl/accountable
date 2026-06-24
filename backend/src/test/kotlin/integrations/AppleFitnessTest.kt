package com.accountable.integrations

import integrations.AppleFitness
import integrations.AppleFitnessTable
import integrations.AppleFitnessWorkouts
import integrations.WorkoutType
import integrations.addWorkout
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
                AppleFitnessTable,
            )
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
}
