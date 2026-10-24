package com.accountable.integrations

import integrations.AppleSteps
import integrations.AppleStepsTable
import integrations.ImportedStepsDay
import integrations.importSteps
import integrations.api.UserIntegrations
import integrations.api.startOfDay
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
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.RefreshTokens
import user.Users

class AppleStepsTest {
    private val testUserID = UUID.randomUUID()
    private val zone = ZoneId.of("America/Chicago")

    /** 2026-06-24 at local noon in Chicago, as the app sends it. */
    private val noon = LocalDateTime.of(2026, 6, 24, 12, 0).atZone(zone).toInstant().toEpochMilli()

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:steps-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens, UserIntegrations, AppleStepsTable)
            AppleStepsTable.deleteAll()
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
    fun `steps land on their local day`() = runBlocking {
        importSteps(testUserID, listOf(ImportedStepsDay(day = noon, steps = 8_400)))

        val day = AppleSteps.getDay(testUserID, noon)
        assertEquals(startOfDay(noon, zone), day?.data?.date)
        assertEquals(8_400L, day?.data?.steps)
    }

    @Test
    fun `re-importing a day replaces its total`() = runBlocking {
        importSteps(testUserID, listOf(ImportedStepsDay(day = noon, steps = 3_000)))
        importSteps(testUserID, listOf(ImportedStepsDay(day = noon, steps = 9_100)))

        assertEquals(9_100L, AppleSteps.getDay(testUserID, noon)?.data?.steps)
    }

    @Test
    fun `re-sending the same total reports no change`() = runBlocking {
        val day = listOf(ImportedStepsDay(day = noon, steps = 10_000))
        assertEquals(1, importSteps(testUserID, day))
        assertEquals(0, importSteps(testUserID, day))
    }

    @Test
    fun `refresh keeps an imported total`() = runBlocking {
        importSteps(testUserID, listOf(ImportedStepsDay(day = noon, steps = 12_000)))

        assertEquals(12_000L, AppleSteps.refresh(testUserID, noon).data.steps)
    }

    @Test
    fun `import enables the integration`() = runBlocking {
        importSteps(testUserID, listOf(ImportedStepsDay(day = noon, steps = 50)))

        val enabled = transaction {
            UserIntegrations.selectAll().map { it[UserIntegrations.integration] }
        }
        assertEquals(listOf(AppleSteps.name), enabled)
    }
}
