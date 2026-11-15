package com.accountable.integrations

import features.goals.Goals
import features.goals.GoalPeriod
import features.goals.METERS_PER_MILE
import features.goals.isMet
import features.goals.progressFor
import features.goals.upsertGoal
import integrations.AppleDistance
import integrations.AppleDistanceTable
import integrations.ImportedDistanceDay
import integrations.api.UserIntegrations
import integrations.api.startOfDay
import integrations.importDistance
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.UUID
import kotlin.math.roundToLong
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.RefreshTokens
import user.Users

class AppleDistanceTest {
    private val testUserID = UUID.randomUUID()
    private val zone = ZoneId.of("America/Chicago")

    /** 2026-06-24 at local noon in Chicago, as the app sends it. */
    private val noon = LocalDateTime.of(2026, 6, 24, 12, 0).atZone(zone).toInstant().toEpochMilli()

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:distance-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens, UserIntegrations, Goals, AppleDistanceTable)
            AppleDistanceTable.deleteAll()
            Goals.deleteAll()
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
    fun `distance lands on its local day`() = runBlocking {
        importDistance(testUserID, listOf(ImportedDistanceDay(day = noon, meters = 6_200)))

        val day = AppleDistance.getDay(testUserID, noon)
        assertEquals(startOfDay(noon, zone), day?.data?.date)
        assertEquals(6_200L, day?.data?.meters)
    }

    @Test
    fun `re-importing a day replaces its total`() = runBlocking {
        importDistance(testUserID, listOf(ImportedDistanceDay(day = noon, meters = 2_000)))
        importDistance(testUserID, listOf(ImportedDistanceDay(day = noon, meters = 7_500)))

        assertEquals(7_500L, AppleDistance.getDay(testUserID, noon)?.data?.meters)
    }

    @Test
    fun `re-sending the same total reports no change`() = runBlocking {
        val day = listOf(ImportedDistanceDay(day = noon, meters = 5_000))
        assertEquals(1, importDistance(testUserID, day))
        assertEquals(0, importDistance(testUserID, day))
    }

    @Test
    fun `refresh keeps an imported total`() = runBlocking {
        importDistance(testUserID, listOf(ImportedDistanceDay(day = noon, meters = 9_000)))

        assertEquals(9_000L, AppleDistance.refresh(testUserID, noon).data.meters)
    }

    @Test
    fun `import enables the integration`() = runBlocking {
        importDistance(testUserID, listOf(ImportedDistanceDay(day = noon, meters = 50)))

        val enabled = transaction {
            UserIntegrations.selectAll().map { it[UserIntegrations.integration] }
        }
        assertEquals(listOf(AppleDistance.name), enabled)
    }

    @Test
    fun `a goal in miles and one in kilometres are held to the same metres`() = runBlocking {
        importDistance(testUserID, listOf(ImportedDistanceDay(day = noon, meters = 5_000)))
        // 3 mi is 4,828 m, so 5 km covers it; 5.5 km isn't reached.
        val miles =
            upsertGoal(
                testUserID,
                "apple_distance",
                "mi",
                GoalPeriod.DAILY,
                (3 * METERS_PER_MILE).roundToLong(),
            )
        val kilometres = upsertGoal(testUserID, "apple_distance", "km", GoalPeriod.DAILY, 5_500)

        assertEquals(5_000L, progressFor(testUserID, miles, noon))
        assertEquals(5_000L, progressFor(testUserID, kilometres, noon))
        assertTrue(miles.isMet(5_000))
        assertFalse(kilometres.isMet(5_000))
    }
}
