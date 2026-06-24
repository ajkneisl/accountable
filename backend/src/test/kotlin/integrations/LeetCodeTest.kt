package com.accountable.integrations

import integrations.LeetCode
import integrations.LeetCodeTable
import integrations.api.UserIntegrations
import integrations.api.startOfUtcDay
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.toByteArray
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import java.util.UUID
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.RefreshTokens
import user.Users

class LeetCodeTest {
    private val testUserID = UUID.randomUUID()
    private val testExternalID = "octocat"

    // A fixed UTC timestamp inside 2025-05-16 so day-bucket math is predictable.
    private val testDate = 1747400000000L

    // Submission timestamp (seconds) that lands inside the same UTC day as testDate.
    private val inDayTimestamp = testDate / 1000

    // Submission timestamp (seconds) well outside that day.
    private val outOfDayTimestamp = 1L

    private lateinit var originalClient: HttpClient

    @BeforeTest
    fun setup() {
        Database.connect(
            url =
                "jdbc:h2:mem:leetcode-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens, UserIntegrations, LeetCodeTable)
            LeetCodeTable.deleteAll()
            UserIntegrations.deleteAll()
            RefreshTokens.deleteAll()
            Users.deleteAll()

            Users.insert {
                it[id] = testUserID
                it[username] = "alice"
                it[email] = "alice@example.com"
                it[password] = "x"
                it[createdAt] = System.currentTimeMillis()
            }
            UserIntegrations.insert {
                it[userID] = testUserID
                it[integration] = "leetcode"
                it[externalID] = testExternalID
            }
        }
        originalClient = LeetCode.client
    }

    @AfterTest
    fun teardown() {
        LeetCode.client = originalClient
    }

    /**
     * Backs LeetCode's two GraphQL queries: the recent-submissions list and the per-question
     * difficulty lookup. [submissions] maps a title slug to a submission timestamp in seconds;
     * [difficulties] maps a title slug to "Easy" / "Medium" / "Hard".
     */
    private fun mockLeetCodeClient(
        submissions: List<Pair<String, Long>>,
        difficulties: Map<String, String> = emptyMap(),
        capture: (String) -> Unit = {},
    ): HttpClient {
        val engine =
            MockEngine { request ->
                val body = String(request.body.toByteArray())
                capture(body)
                val content =
                    if (body.contains("recentAcSubmissionList")) {
                        val items =
                            submissions.joinToString(",") { (slug, ts) ->
                                """{"titleSlug":"$slug","timestamp":"$ts"}"""
                            }
                        """{"data":{"recentAcSubmissionList":[$items]}}"""
                    } else {
                        val slug =
                            Regex("\"titleSlug\":\"([^\"]+)\"").find(body)?.groupValues?.get(1)
                        val difficulty = difficulties[slug]
                        if (difficulty != null) {
                            """{"data":{"question":{"difficulty":"$difficulty"}}}"""
                        } else {
                            """{"data":{"question":null}}"""
                        }
                    }
                respond(
                    content = content,
                    status = HttpStatusCode.OK,
                    headers = headersOf(HttpHeaders.ContentType, "application/json"),
                )
            }
        return HttpClient(engine) {
            install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        }
    }

    @Test
    fun `pullData buckets in-day submissions by difficulty`() = runBlocking {
        LeetCode.client =
            mockLeetCodeClient(
                submissions =
                    listOf(
                        "two-sum" to inDayTimestamp,
                        "add-two-numbers" to inDayTimestamp,
                        "median-of-two" to inDayTimestamp,
                        "trapping-rain-water" to inDayTimestamp,
                    ),
                difficulties =
                    mapOf(
                        "two-sum" to "Easy",
                        "add-two-numbers" to "Medium",
                        "median-of-two" to "Hard",
                        "trapping-rain-water" to "Hard",
                    ),
            )

        val data = LeetCode.pullData(testUserID, testDate)

        assertEquals(1L, data.easy)
        assertEquals(1L, data.medium)
        assertEquals(2L, data.hard)
        assertEquals(startOfUtcDay(testDate), data.date)
    }

    @Test
    fun `pullData ignores submissions outside the target day`() = runBlocking {
        LeetCode.client =
            mockLeetCodeClient(
                submissions =
                    listOf(
                        "two-sum" to inDayTimestamp,
                        "add-two-numbers" to outOfDayTimestamp,
                    ),
                difficulties = mapOf("two-sum" to "Easy", "add-two-numbers" to "Medium"),
            )

        val data = LeetCode.pullData(testUserID, testDate)

        assertEquals(1L, data.easy)
        assertEquals(0L, data.medium)
        assertEquals(0L, data.hard)
    }

    @Test
    fun `pullData counts a repeated slug once`() = runBlocking {
        LeetCode.client =
            mockLeetCodeClient(
                submissions =
                    listOf("two-sum" to inDayTimestamp, "two-sum" to inDayTimestamp),
                difficulties = mapOf("two-sum" to "Easy"),
            )

        val data = LeetCode.pullData(testUserID, testDate)

        assertEquals(1L, data.easy)
    }

    @Test
    fun `pullData queries the linked external username`() = runBlocking {
        val bodies = mutableListOf<String>()
        LeetCode.client =
            mockLeetCodeClient(submissions = emptyList()) { bodies.add(it) }

        LeetCode.pullData(testUserID, testDate)

        val recentBody = bodies.firstOrNull { it.contains("recentAcSubmissionList") }
        assertNotNull(recentBody)
        assertTrue(
            recentBody.contains("\"username\":\"$testExternalID\""),
            "request missing external id: $recentBody",
        )
    }

    @Test
    fun `refresh writes a row and returns fetchedAt within now`() = runBlocking {
        LeetCode.client =
            mockLeetCodeClient(
                submissions = listOf("two-sum" to inDayTimestamp),
                difficulties = mapOf("two-sum" to "Medium"),
            )

        val before = System.currentTimeMillis()
        val record = LeetCode.refresh(testUserID, testDate)
        val after = System.currentTimeMillis()

        assertEquals(1L, record.data.medium)
        assertTrue(
            record.fetchedAt in before..after,
            "fetchedAt ${record.fetchedAt} not in [$before, $after]",
        )

        val row =
            transaction {
                LeetCodeTable.selectAll()
                    .where {
                        (LeetCodeTable.userID eq testUserID) and
                            (LeetCodeTable.date eq startOfUtcDay(testDate))
                    }
                    .firstOrNull()
            }
        assertNotNull(row)
        assertEquals(1L, row[LeetCodeTable.medium])
    }

    @Test
    fun `refresh twice updates the same row instead of inserting`() = runBlocking {
        LeetCode.client =
            mockLeetCodeClient(
                submissions = listOf("two-sum" to inDayTimestamp),
                difficulties = mapOf("two-sum" to "Easy"),
            )
        LeetCode.refresh(testUserID, testDate)

        LeetCode.client =
            mockLeetCodeClient(
                submissions =
                    listOf("two-sum" to inDayTimestamp, "add-two-numbers" to inDayTimestamp),
                difficulties = mapOf("two-sum" to "Easy", "add-two-numbers" to "Hard"),
            )
        LeetCode.refresh(testUserID, testDate)

        val rows =
            transaction {
                LeetCodeTable.selectAll()
                    .where {
                        (LeetCodeTable.userID eq testUserID) and
                            (LeetCodeTable.date eq startOfUtcDay(testDate))
                    }
                    .toList()
            }
        assertEquals(1, rows.size)
        assertEquals(1L, rows[0][LeetCodeTable.easy])
        assertEquals(1L, rows[0][LeetCodeTable.hard])
    }

    @Test
    fun `refresh backfills past days from the recent window in one pass`() = runBlocking {
        // A single recentAcSubmissionList call returns solves spanning several days; refreshing
        // "today" should also write rows for the earlier days, not just the target.
        val yesterday = inDayTimestamp - 24 * 60 * 60
        LeetCode.client =
            mockLeetCodeClient(
                submissions =
                    listOf(
                        "two-sum" to inDayTimestamp,
                        "trapping-rain-water" to yesterday,
                    ),
                difficulties =
                    mapOf("two-sum" to "Easy", "trapping-rain-water" to "Hard"),
            )

        LeetCode.refresh(testUserID, testDate)

        val today = LeetCode.getDay(testUserID, testDate)
        assertNotNull(today)
        assertEquals(1L, today.data.easy)

        val priorDay = LeetCode.getDay(testUserID, testDate - 24 * 60 * 60 * 1000)
        assertNotNull(priorDay)
        assertEquals(1L, priorDay.data.hard)
    }

    @Test
    fun `getDay returns null when no row exists`() = runBlocking {
        val result = LeetCode.getDay(testUserID, testDate)
        assertNull(result)
    }

    @Test
    fun `getDay returns the stored record after refresh`() = runBlocking {
        LeetCode.client =
            mockLeetCodeClient(
                submissions = listOf("two-sum" to inDayTimestamp),
                difficulties = mapOf("two-sum" to "Hard"),
            )
        LeetCode.refresh(testUserID, testDate)

        val record = LeetCode.getDay(testUserID, testDate)

        assertNotNull(record)
        assertEquals(1L, record.data.hard)
        assertEquals(startOfUtcDay(testDate), record.data.date)
    }

    @Test
    fun `pullData throws when the user has not enabled leetcode`() = runBlocking {
        transaction { UserIntegrations.deleteAll() }
        LeetCode.client = mockLeetCodeClient(submissions = emptyList())

        val ex = runCatching { LeetCode.pullData(testUserID, testDate) }.exceptionOrNull()
        assertNotNull(ex)
        assertTrue(
            ex.message!!.contains("has not enabled integration 'leetcode'"),
            "unexpected message: ${ex.message}",
        )
    }
}