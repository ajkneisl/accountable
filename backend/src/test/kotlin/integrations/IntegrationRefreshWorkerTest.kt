package com.accountable.integrations

import integrations.AppleFitness
import integrations.AppleFitnessTable
import integrations.AppleFitnessWorkouts
import integrations.WorkoutType
import integrations.addWorkout
import integrations.api.IntegrationRefreshWorker
import integrations.api.UserIntegrations
import integrations.api.millisUntilNextHour
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.transactions.transaction
import user.RefreshTokens
import user.Users

class IntegrationRefreshWorkerTest {
    private val testUserID = UUID.randomUUID()
    private val zone = ZoneId.of("America/Chicago")

    private fun chicago(y: Int, mo: Int, d: Int, h: Int) =
        LocalDateTime.of(y, mo, d, h, 0).atZone(zone).toInstant().toEpochMilli()

    private val local11pm = chicago(2026, 6, 23, 23)
    private val localNoon = chicago(2026, 6, 23, 12)
    private val workoutTime = chicago(2026, 6, 23, 22) // earlier the same day as local11pm

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:worker-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
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
    fun `refreshes users whose local clock is at 11pm`() = runBlocking {
        addWorkout(testUserID, WorkoutType.RUN, 30, 150, workoutTime) // auto-enables apple_fitness
        transaction { AppleFitnessTable.deleteAll() } // drop the rollup the add wrote

        IntegrationRefreshWorker.refreshUsersAtRefreshHour(now = local11pm)

        // The worker refreshed today, rebuilding its rollup row from the day's workouts.
        assertEquals(150L, AppleFitness.getDay(testUserID, workoutTime)?.data?.calories)
    }

    @Test
    fun `skips users not at their refresh hour`() = runBlocking {
        addWorkout(testUserID, WorkoutType.RUN, 30, 150, workoutTime)
        transaction { AppleFitnessTable.deleteAll() }

        IntegrationRefreshWorker.refreshUsersAtRefreshHour(now = localNoon)

        assertNull(AppleFitness.getDay(testUserID, workoutTime))
    }

    @Test
    fun `millisUntilNextHour counts down to the top of the hour`() {
        assertEquals(50L * 60 * 1000, millisUntilNextHour(70L * 60 * 1000)) // 1h10m in → 50m left
    }
}
