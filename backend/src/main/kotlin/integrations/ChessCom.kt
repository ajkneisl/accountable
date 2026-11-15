package integrations

import api.suspendTransaction
import integrations.api.Integration
import integrations.api.IntegrationRecord
import integrations.api.IntegrationTable
import integrations.api.externalIDFor
import integrations.api.startOfDay
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.encodeURLPathPart
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import java.time.Instant
import java.time.YearMonth
import java.time.ZoneOffset
import java.util.UUID
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.upsert
import user.zoneOf

/** Per-day chess.com games finished, and how many of them were won or drawn. */
object ChessComTable : IntegrationTable("integrations_chess_com") {
    val games = long("games")
    val wins = long("wins")
    val draws = long("draws")
}

object ChessCom : Integration<ChessCom.ChessComData> {
    override val name = "chess_com"
    override val table = ChessComTable

    private const val ENDPOINT = "https://api.chess.com/pub/player"

    /** chess.com asks API clients to say who they are. */
    private const val USER_AGENT = "Beacc (+https://beacc.app)"

    private const val DAY_MS = 24L * 60 * 60 * 1000

    /** How a game that nobody won is recorded for each player. */
    private val DRAWS =
        setOf("agreed", "repetition", "stalemate", "insufficient", "50move", "timevsinsufficient")

    /** Mutable so tests can swap in a `MockEngine`-backed client. */
    internal var client: HttpClient =
        HttpClient(CIO) { install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) } }

    override suspend fun pullData(userID: UUID, date: Long): ChessComData {
        val target = startOfDay(date, zoneOf(userID))
        return pullAround(userID, target)[target] ?: empty(target)
    }

    private fun empty(day: Long) = ChessComData(date = day, games = 0, wins = 0, draws = 0)

    /**
     * Every game around the local day starting at [dayStart], tallied per day (in [userID]'s
     * timezone) by when it finished. chess.com serves games a month at a time, so one call covers
     * the whole month: callers can backfill every day in it from the same request. Days without a
     * finished game are simply absent.
     *
     * The archives are split on a month boundary that needn't match the user's, so a day at
     * either end of a month reads the neighbouring month too.
     */
    private suspend fun pullAround(userID: UUID, dayStart: Long): Map<Long, ChessComData> {
        val username = externalIDFor(userID, name).trim().lowercase()
        val zone = zoneOf(userID)
        val months =
            listOf(dayStart - DAY_MS, dayStart + 2 * DAY_MS)
                .map { YearMonth.from(Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC)) }
                .distinct()

        val days = mutableMapOf<Long, ChessComData>()
        for (game in months.flatMap { archive(username, it) }) {
            val result =
                when {
                    game.white.username.equals(username, ignoreCase = true) -> game.white.result
                    game.black.username.equals(username, ignoreCase = true) -> game.black.result
                    else -> continue
                }
            val day = startOfDay(game.endTime * 1000, zone)
            val soFar = days[day] ?: empty(day)
            days[day] =
                soFar.copy(
                    games = soFar.games + 1,
                    wins = soFar.wins + if (result == "win") 1 else 0,
                    draws = soFar.draws + if (result in DRAWS) 1 else 0,
                )
        }
        return days
    }

    /**
     * One month of [username]'s finished games. A month with nothing in it can come back as a 404,
     * which is also what an unknown player gets — so that case is checked, and only a real player
     * reads as "no games".
     */
    private suspend fun archive(username: String, month: YearMonth): List<Game> {
        val player = "$ENDPOINT/${username.encodeURLPathPart()}"
        val path = "%04d/%02d".format(month.year, month.monthValue)
        val response = client.get("$player/games/$path") { header(HttpHeaders.UserAgent, USER_AGENT) }
        if (response.status == HttpStatusCode.NotFound) {
            val profile = client.get(player) { header(HttpHeaders.UserAgent, USER_AGENT) }
            if (!profile.status.isSuccess()) error("chess.com has no player '$username'")
            return emptyList()
        }
        if (!response.status.isSuccess()) error("chess.com answered ${response.status}")
        return response.body<Archive>().games
    }

    /**
     * Pull and upsert. Backfills every day of the month in the same pass — the read routes only
     * ever refresh "today" and serve past days straight from storage, so without this a game that
     * finished after a day's last refresh would never be counted.
     */
    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<ChessComData> {
        val target = startOfDay(date, zoneOf(userID))
        val byDay = pullAround(userID, target)
        val targetDay = byDay[target] ?: empty(target)
        val now = System.currentTimeMillis()
        suspendTransaction {
            // The target day is always (re)written, even when empty, plus every day with a game.
            (byDay.values + targetDay).distinctBy { it.date }.forEach { day ->
                ChessComTable.upsert {
                    it[ChessComTable.userID] = userID
                    it[ChessComTable.date] = day.date
                    it[ChessComTable.games] = day.games
                    it[ChessComTable.wins] = day.wins
                    it[ChessComTable.draws] = day.draws
                    it[ChessComTable.fetchedAt] = now
                }
            }
        }
        return IntegrationRecord(targetDay, now)
    }

    override suspend fun getDay(userID: UUID, date: Long): IntegrationRecord<ChessComData>? {
        val dayStart = startOfDay(date, zoneOf(userID))
        return suspendTransaction {
            ChessComTable.selectAll()
                .where { (ChessComTable.userID eq userID) and (ChessComTable.date eq dayStart) }
                .limit(1)
                .firstOrNull()
                ?.let {
                    IntegrationRecord(
                        data =
                            ChessComData(
                                date = it[ChessComTable.date],
                                games = it[ChessComTable.games],
                                wins = it[ChessComTable.wins],
                                draws = it[ChessComTable.draws],
                            ),
                        fetchedAt = it[ChessComTable.fetchedAt],
                    )
                }
        }
    }

    override suspend fun history(userID: UUID, since: Long): List<ChessComData> = suspendTransaction {
        ChessComTable.selectAll()
            .where { (ChessComTable.userID eq userID) and (ChessComTable.date greaterEq since) }
            .orderBy(ChessComTable.date, SortOrder.DESC)
            .map {
                ChessComData(
                    date = it[ChessComTable.date],
                    games = it[ChessComTable.games],
                    wins = it[ChessComTable.wins],
                    draws = it[ChessComTable.draws],
                )
            }
    }

    @Serializable private data class Archive(val games: List<Game> = emptyList())

    @Serializable
    private data class Game(
        /** When the game finished, in seconds. */
        @SerialName("end_time") val endTime: Long,
        val white: Side,
        val black: Side,
    )

    @Serializable private data class Side(val username: String, val result: String)

    /** One day of games. Losses are the games that were neither won nor drawn. */
    @Serializable
    @SerialName("chess_com")
    data class ChessComData(
        override val date: Long,
        val games: Long,
        val wins: Long,
        val draws: Long,
    ) : IntegrationData()
}
