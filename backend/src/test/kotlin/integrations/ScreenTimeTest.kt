package com.accountable.integrations

import integrations.ImportedScreenTimeDay
import integrations.ScreenTime
import integrations.ScreenTimeTable
import integrations.importScreenTime
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

class ScreenTimeTest {
    private val testUserID = UUID.randomUUID()
    private val zone = ZoneId.of("America/Chicago")

    /** 2026-06-24 at local noon in Chicago, as the app sends it. */
    private val noon = LocalDateTime.of(2026, 6, 24, 12, 0).atZone(zone).toInstant().toEpochMilli()

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:screen-time-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens, UserIntegrations, ScreenTimeTable)
            ScreenTimeTable.deleteAll()
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
    fun `screen time lands on its local day`() = runBlocking {
        importScreenTime(testUserID, listOf(ImportedScreenTimeDay(day = noon, minutes = 195)))

        val day = ScreenTime.getDay(testUserID, noon)
        assertEquals(startOfDay(noon, zone), day?.data?.date)
        assertEquals(195L, day?.data?.minutes)
    }

    @Test
    fun `re-importing a day raises its total`() = runBlocking {
        importScreenTime(testUserID, listOf(ImportedScreenTimeDay(day = noon, minutes = 45)))
        importScreenTime(testUserID, listOf(ImportedScreenTimeDay(day = noon, minutes = 120)))

        assertEquals(120L, ScreenTime.getDay(testUserID, noon)?.data?.minutes)
    }

    @Test
    fun `a lower total from a reset phone doesn't lower the day`() = runBlocking {
        importScreenTime(testUserID, listOf(ImportedScreenTimeDay(day = noon, minutes = 180)))

        assertEquals(0, importScreenTime(testUserID, listOf(ImportedScreenTimeDay(day = noon, minutes = 0))))
        assertEquals(180L, ScreenTime.getDay(testUserID, noon)?.data?.minutes)
    }

    @Test
    fun `a first import of zero still records the day`() = runBlocking {
        assertEquals(1, importScreenTime(testUserID, listOf(ImportedScreenTimeDay(day = noon, minutes = 0))))
        assertEquals(0L, ScreenTime.getDay(testUserID, noon)?.data?.minutes)
    }

    @Test
    fun `a day repeated in one import keeps the larger total`() = runBlocking {
        importScreenTime(
            testUserID,
            listOf(
                ImportedScreenTimeDay(day = noon, minutes = 90),
                ImportedScreenTimeDay(day = noon, minutes = 30),
            ),
        )

        assertEquals(90L, ScreenTime.getDay(testUserID, noon)?.data?.minutes)
    }

    @Test
    fun `re-sending the same total reports no change`() = runBlocking {
        val day = listOf(ImportedScreenTimeDay(day = noon, minutes = 60))
        assertEquals(1, importScreenTime(testUserID, day))
        assertEquals(0, importScreenTime(testUserID, day))
    }

    @Test
    fun `refresh keeps an imported total`() = runBlocking {
        importScreenTime(testUserID, listOf(ImportedScreenTimeDay(day = noon, minutes = 240)))

        assertEquals(240L, ScreenTime.refresh(testUserID, noon).data.minutes)
    }

    @Test
    fun `import enables the integration`() = runBlocking {
        importScreenTime(testUserID, listOf(ImportedScreenTimeDay(day = noon, minutes = 15)))

        val enabled = transaction {
            UserIntegrations.selectAll().map { it[UserIntegrations.integration] }
        }
        assertEquals(listOf(ScreenTime.name), enabled)
    }
}
