package com.accountable.integrations

import integrations.AppleSleep
import integrations.AppleSleepTable
import integrations.ImportedSleepDay
import integrations.importSleep
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

class AppleSleepTest {
    private val testUserID = UUID.randomUUID()
    private val zone = ZoneId.of("America/Chicago")

    /** 2026-06-24 07:00 in Chicago: waking up after the night of the 23rd. */
    private val wokeAt = LocalDateTime.of(2026, 6, 24, 7, 0).atZone(zone).toInstant().toEpochMilli()

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:sleep-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens, UserIntegrations, AppleSleepTable)
            AppleSleepTable.deleteAll()
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
    fun `sleep lands on the local day it ended`() = runBlocking {
        importSleep(testUserID, listOf(ImportedSleepDay(endedAt = wokeAt, minutes = 450)))

        val day = AppleSleep.getDay(testUserID, wokeAt)
        assertEquals(startOfDay(wokeAt, zone), day?.data?.date)
        assertEquals(450L, day?.data?.minutes)
    }

    @Test
    fun `re-importing a day replaces its total`() = runBlocking {
        importSleep(testUserID, listOf(ImportedSleepDay(endedAt = wokeAt, minutes = 300)))
        importSleep(testUserID, listOf(ImportedSleepDay(endedAt = wokeAt, minutes = 420)))

        assertEquals(420L, AppleSleep.getDay(testUserID, wokeAt)?.data?.minutes)
    }

    @Test
    fun `re-sending the same total reports no change`() = runBlocking {
        val day = listOf(ImportedSleepDay(endedAt = wokeAt, minutes = 420))
        assertEquals(1, importSleep(testUserID, day))
        assertEquals(0, importSleep(testUserID, day))
    }

    @Test
    fun `refresh keeps an imported total`() = runBlocking {
        importSleep(testUserID, listOf(ImportedSleepDay(endedAt = wokeAt, minutes = 480)))

        assertEquals(480L, AppleSleep.refresh(testUserID, wokeAt).data.minutes)
    }

    @Test
    fun `refresh of a day with no sleep stores zero`() = runBlocking {
        assertEquals(0L, AppleSleep.refresh(testUserID, wokeAt).data.minutes)
    }

    @Test
    fun `import enables the integration`() = runBlocking {
        importSleep(testUserID, listOf(ImportedSleepDay(endedAt = wokeAt, minutes = 60)))

        val enabled = transaction {
            UserIntegrations.selectAll().map { it[UserIntegrations.integration] }
        }
        assertEquals(listOf(AppleSleep.name), enabled)
    }
}
