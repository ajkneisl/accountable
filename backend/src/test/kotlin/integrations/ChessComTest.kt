package com.accountable.integrations

import integrations.ChessCom
import integrations.ChessComTable
import integrations.api.UserIntegrations
import integrations.api.startOfDay
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.UUID
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.transactions.transaction
import user.RefreshTokens
import user.Users

class ChessComTest {
    private val testUserID = UUID.randomUUID()
    private val zone = ZoneId.of("America/Chicago")

    /** Linked with capitals, as someone would type it; chess.com wants it lowercase. */
    private val linkedAs = "Hikaru"

    private lateinit var originalClient: HttpClient

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:chess-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens, UserIntegrations, ChessComTable)
            ChessComTable.deleteAll()
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
            UserIntegrations.insert {
                it[userID] = testUserID
                it[integration] = "chess_com"
                it[externalID] = linkedAs
            }
        }
        originalClient = ChessCom.client
    }

    @AfterTest
    fun teardown() {
        ChessCom.client = originalClient
    }

    /** Ms epoch of a Chicago wall-clock time. */
    private fun at(month: Int, day: Int, hour: Int, minute: Int = 0): Long =
        LocalDateTime.of(2026, month, day, hour, minute).atZone(zone).toInstant().toEpochMilli()

    /** A finished game as chess.com lists it, with the linked player on [side]. */
    private fun game(endsAt: Long, side: String, result: String): String {
        val me = """{"username":"$linkedAs","result":"$result","rating":3200}"""
        val them = """{"username":"opponent","result":"whatever","rating":3100}"""
        val (white, black) = if (side == "white") me to them else them to me
        return """{"url":"x","pgn":"1. e4","end_time":${endsAt / 1000},"white":$white,"black":$black}"""
    }

    /**
     * Serves each month's archive from [archives] (keyed "2026/06"); a month that isn't there is
     * empty. [seen] collects the paths asked for.
     */
    private fun mockClient(
        archives: Map<String, List<String>>,
        seen: MutableList<String> = mutableListOf(),
        respondTo: (String) -> Pair<HttpStatusCode, String>? = { null },
    ): HttpClient {
        val engine = MockEngine { request ->
            val path = request.url.encodedPath
            seen += path
            assertTrue(request.headers[HttpHeaders.UserAgent].orEmpty().contains("Beacc"))
            val (status, content) =
                respondTo(path)
                    ?: (HttpStatusCode.OK to
                        """{"games":[${archives[path.substringAfter("/games/")].orEmpty().joinToString(",")}]}""")
            respond(
                content = content,
                status = status,
                headers = headersOf(HttpHeaders.ContentType, "application/json"),
            )
        }
        return HttpClient(engine) {
            install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        }
    }

    @Test
    fun `tallies a day's games by how they went`() = runBlocking {
        ChessCom.client =
            mockClient(
                mapOf(
                    "2026/06" to
                        listOf(
                            game(at(6, 23, 23, 30), "white", "win"),
                            game(at(6, 24, 10), "white", "win"),
                            game(at(6, 24, 15), "black", "resigned"),
                            game(at(6, 24, 20), "black", "agreed"),
                        )
                )
            )

        val today = ChessCom.refresh(testUserID, at(6, 24, 12)).data
        assertEquals(startOfDay(at(6, 24, 12), zone), today.date)
        assertEquals(3L, today.games)
        assertEquals(1L, today.wins)
        assertEquals(1L, today.draws)

        // The day before came back in the same archive, so it's stored too.
        assertEquals(1L, ChessCom.getDay(testUserID, at(6, 23, 12))?.data?.games)
    }

    @Test
    fun `a late game counts on the local day it finished`() = runBlocking {
        // 11:30pm in Chicago is already the next day in UTC.
        ChessCom.client =
            mockClient(mapOf("2026/06" to listOf(game(at(6, 24, 23, 30), "white", "checkmated"))))

        val today = ChessCom.refresh(testUserID, at(6, 24, 12)).data
        assertEquals(1L, today.games)
        assertEquals(0L, today.wins)
    }

    @Test
    fun `the last day of a month reads the next month's archive too`() = runBlocking {
        // 9pm on June 30 in Chicago is 2am on July 1 in UTC.
        val seen = mutableListOf<String>()
        ChessCom.client =
            mockClient(mapOf("2026/07" to listOf(game(at(6, 30, 21), "black", "win"))), seen)

        val today = ChessCom.refresh(testUserID, at(6, 30, 12)).data
        assertEquals(1L, today.games)
        assertEquals(1L, today.wins)
        assertEquals(
            listOf("/pub/player/hikaru/games/2026/06", "/pub/player/hikaru/games/2026/07"),
            seen,
        )
    }

    @Test
    fun `a day without games is stored as zero`() = runBlocking {
        ChessCom.client = mockClient(emptyMap())

        assertEquals(0L, ChessCom.refresh(testUserID, at(6, 24, 12)).data.games)
        assertEquals(0L, ChessCom.getDay(testUserID, at(6, 24, 12))?.data?.games)
    }

    @Test
    fun `an empty month from a real player is no games, not an error`() = runBlocking {
        ChessCom.client =
            mockClient(emptyMap()) { path ->
                if (path.contains("/games/")) HttpStatusCode.NotFound to """{"code":0}"""
                else HttpStatusCode.OK to """{"username":"hikaru"}"""
            }

        assertEquals(0L, ChessCom.refresh(testUserID, at(6, 24, 12)).data.games)
    }

    @Test
    fun `an unknown player fails rather than reading as no games`(): Unit = runBlocking {
        ChessCom.client =
            mockClient(emptyMap()) { HttpStatusCode.NotFound to """{"code":0}""" }

        assertFailsWith<IllegalStateException> { ChessCom.refresh(testUserID, at(6, 24, 12)) }
    }
}
