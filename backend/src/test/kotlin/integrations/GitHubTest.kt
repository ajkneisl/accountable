package com.accountable.integrations

import integrations.GitHub
import integrations.GitHubTable
import integrations.api.UserIntegrations
import integrations.api.startOfUtcDay
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.HttpRequestData
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

class GitHubTest {
    private val testUserID = UUID.randomUUID()
    private val testExternalID = "octocat"

    // A fixed UTC timestamp inside 2025-05-16 so day-bucket math is predictable.
    private val testDate = 1747400000000L

    private lateinit var originalClient: HttpClient

    @BeforeTest
    fun setup() {
        Database.connect(
            url =
                "jdbc:h2:mem:github-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens, UserIntegrations, GitHubTable)
            GitHubTable.deleteAll()
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
                it[integration] = "github"
                it[externalID] = testExternalID
            }
        }
        originalClient = GitHub.client
    }

    @AfterTest
    fun teardown() {
        GitHub.client = originalClient
    }

    private fun mockGitHubClient(
        totalCount: Long,
        capture: (HttpRequestData) -> Unit = {},
    ): HttpClient {
        val engine =
            MockEngine { request ->
                capture(request)
                respond(
                    content = """{"total_count": $totalCount, "items": []}""",
                    status = HttpStatusCode.OK,
                    headers = headersOf(HttpHeaders.ContentType, "application/json"),
                )
            }
        return HttpClient(engine) {
            install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        }
    }

    @Test
    fun `pullData returns commits from API response`() = runBlocking {
        GitHub.client = mockGitHubClient(totalCount = 7)

        val data = GitHub.pullData(testUserID, testDate)

        assertEquals(7L, data.commits)
        assertEquals(startOfUtcDay(testDate), data.date)
    }

    @Test
    fun `pullData queries the linked external username and target day`() = runBlocking {
        var captured: HttpRequestData? = null
        GitHub.client = mockGitHubClient(totalCount = 0) { captured = it }

        GitHub.pullData(testUserID, testDate)

        val q = captured!!.url.parameters["q"]
        assertNotNull(q)
        assertTrue(q.contains("author:$testExternalID"), "query missing external id: $q")
        assertTrue(q.contains("author-date:2025-05-16"), "query missing target date: $q")
    }

    @Test
    fun `refresh writes a row and returns fetchedAt within now`() = runBlocking {
        GitHub.client = mockGitHubClient(totalCount = 3)

        val before = System.currentTimeMillis()
        val record = GitHub.refresh(testUserID, testDate)
        val after = System.currentTimeMillis()

        assertEquals(3L, record.data.commits)
        assertTrue(
            record.fetchedAt in before..after,
            "fetchedAt ${record.fetchedAt} not in [$before, $after]",
        )

        val row =
            transaction {
                GitHubTable.selectAll()
                    .where {
                        (GitHubTable.userID eq testUserID) and
                            (GitHubTable.date eq startOfUtcDay(testDate))
                    }
                    .firstOrNull()
            }
        assertNotNull(row)
        assertEquals(3L, row[GitHubTable.commits])
    }

    @Test
    fun `refresh twice updates the same row instead of inserting`() = runBlocking {
        GitHub.client = mockGitHubClient(totalCount = 2)
        GitHub.refresh(testUserID, testDate)

        GitHub.client = mockGitHubClient(totalCount = 5)
        GitHub.refresh(testUserID, testDate)

        val rows =
            transaction {
                GitHubTable.selectAll()
                    .where {
                        (GitHubTable.userID eq testUserID) and
                            (GitHubTable.date eq startOfUtcDay(testDate))
                    }
                    .toList()
            }
        assertEquals(1, rows.size)
        assertEquals(5L, rows[0][GitHubTable.commits])
    }

    @Test
    fun `getDay returns null when no row exists`() = runBlocking {
        val result = GitHub.getDay(testUserID, testDate)
        assertNull(result)
    }

    @Test
    fun `getDay returns the stored record after refresh`() = runBlocking {
        GitHub.client = mockGitHubClient(totalCount = 4)
        GitHub.refresh(testUserID, testDate)

        val record = GitHub.getDay(testUserID, testDate)

        assertNotNull(record)
        assertEquals(4L, record.data.commits)
        assertEquals(startOfUtcDay(testDate), record.data.date)
    }

    @Test
    fun `pullData throws when the user has not enabled github`() = runBlocking {
        transaction { UserIntegrations.deleteAll() }
        GitHub.client = mockGitHubClient(totalCount = 0)

        val ex = runCatching { GitHub.pullData(testUserID, testDate) }.exceptionOrNull()
        assertNotNull(ex)
        assertTrue(
            ex.message!!.contains("has not enabled integration 'github'"),
            "unexpected message: ${ex.message}",
        )
    }
}
