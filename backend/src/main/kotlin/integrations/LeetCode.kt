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
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import java.util.UUID
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.upsert
import user.zoneOf

/** Per-day counts of accepted LeetCode submissions, bucketed by problem difficulty. */
object LeetCodeTable : IntegrationTable("integrations_leetcode") {
    val easy = long("easy")
    val medium = long("medium")
    val hard = long("hard")
}

object LeetCode : Integration<LeetCode.LeetCodeData> {
    override val name = "leetcode"
    override val table = LeetCodeTable

    private const val ENDPOINT = "https://leetcode.com/graphql"

    // LeetCode's recentAcSubmissionList caps at 20; users solving more than that in a single
    // day will under-count. Acceptable for an MVP — revisit if it bites.
    private const val RECENT_LIMIT = 20

    /** Mutable so tests can swap in a `MockEngine`-backed client. */
    internal var client: HttpClient =
        HttpClient(CIO) { install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) } }

    override suspend fun pullData(userID: UUID, date: Long): LeetCodeData {
        val target = startOfDay(date, zoneOf(userID))
        return pullRecentByDay(userID)[target]
            ?: LeetCodeData(date = target, easy = 0, medium = 0, hard = 0)
    }

    /**
     * Fetch the recent accepted-submission window once and bucket every day it spans by difficulty,
     * keyed by start-of-day (in [userID]'s timezone). A single call covers multiple days because
     * `recentAcSubmissionList` returns the last [RECENT_LIMIT] submissions across all days, not just
     * one — so callers can backfill several days from one request. Days with no accepted submission
     * are simply absent from the map.
     */
    private suspend fun pullRecentByDay(userID: UUID): Map<Long, LeetCodeData> {
        val externalID = externalIDFor(userID, name)
        val zone = zoneOf(userID)

        val recent: RecentAcResponse =
            graphql(
                RECENT_AC_QUERY,
                buildJsonObject {
                    put("username", externalID)
                    put("limit", RECENT_LIMIT)
                },
            )

        // Resolve difficulty once per unique slug to avoid redundant question lookups.
        val difficultyBySlug =
            recent.data.recentAcSubmissionList
                .map { it.titleSlug }
                .distinct()
                .associateWith { questionDifficulty(it) }

        val easy = mutableMapOf<Long, Long>()
        val medium = mutableMapOf<Long, Long>()
        val hard = mutableMapOf<Long, Long>()
        // Count each slug at most once per day.
        val counted = mutableSetOf<Pair<Long, String>>()
        for (sub in recent.data.recentAcSubmissionList) {
            val day = startOfDay(sub.timestamp.toLong() * 1000, zone)
            if (!counted.add(day to sub.titleSlug)) continue
            when (difficultyBySlug[sub.titleSlug]) {
                "Easy" -> easy.merge(day, 1L, Long::plus)
                "Medium" -> medium.merge(day, 1L, Long::plus)
                "Hard" -> hard.merge(day, 1L, Long::plus)
            }
        }

        return (easy.keys + medium.keys + hard.keys).associateWith { day ->
            LeetCodeData(
                date = day,
                easy = easy[day] ?: 0L,
                medium = medium[day] ?: 0L,
                hard = hard[day] ?: 0L,
            )
        }
    }

    /**
     * Pull and upsert. Backfills every recent day in the same pass — the read routes only ever
     * refresh "today" and serve past days straight from storage, so without this a day first
     * fetched before its solving happened (e.g. a midnight refresh) would stay frozen at 0.
     */
    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<LeetCodeData> {
        val target = startOfDay(date, zoneOf(userID))
        val byDay = pullRecentByDay(userID)
        val targetData =
            byDay[target] ?: LeetCodeData(date = target, easy = 0, medium = 0, hard = 0)
        val now = System.currentTimeMillis()
        suspendTransaction {
            // Always (re)write the target day, even when empty, plus every other recent day with
            // solves. Days that have scrolled out of the recent window are left untouched.
            (byDay.values + targetData).distinctBy { it.date }.forEach { record ->
                LeetCodeTable.upsert {
                    it[LeetCodeTable.userID] = userID
                    it[LeetCodeTable.date] = record.date
                    it[LeetCodeTable.easy] = record.easy
                    it[LeetCodeTable.medium] = record.medium
                    it[LeetCodeTable.hard] = record.hard
                    it[LeetCodeTable.fetchedAt] = now
                }
            }
        }
        return IntegrationRecord(targetData, now)
    }

    override suspend fun getDay(userID: UUID, date: Long): IntegrationRecord<LeetCodeData>? {
        val dayStart = startOfDay(date, zoneOf(userID))
        return suspendTransaction {
            LeetCodeTable.selectAll()
                .where { (LeetCodeTable.userID eq userID) and (LeetCodeTable.date eq dayStart) }
                .limit(1)
                .firstOrNull()
                ?.let {
                    IntegrationRecord(
                        data =
                            LeetCodeData(
                                date = it[LeetCodeTable.date],
                                easy = it[LeetCodeTable.easy],
                                medium = it[LeetCodeTable.medium],
                                hard = it[LeetCodeTable.hard],
                            ),
                        fetchedAt = it[LeetCodeTable.fetchedAt],
                    )
                }
        }
    }

    override suspend fun history(userID: UUID, since: Long): List<LeetCodeData> = suspendTransaction {
        LeetCodeTable.selectAll()
            .where { (LeetCodeTable.userID eq userID) and (LeetCodeTable.date greaterEq since) }
            .orderBy(LeetCodeTable.date, SortOrder.DESC)
            .map {
                LeetCodeData(
                    date = it[LeetCodeTable.date],
                    easy = it[LeetCodeTable.easy],
                    medium = it[LeetCodeTable.medium],
                    hard = it[LeetCodeTable.hard],
                )
            }
    }

    private suspend fun questionDifficulty(titleSlug: String): String? {
        val resp: QuestionResponse =
            graphql(QUESTION_QUERY, buildJsonObject { put("titleSlug", titleSlug) })
        return resp.data.question?.difficulty
    }

    private suspend inline fun <reified T> graphql(query: String, variables: JsonObject): T =
        client
            .post(ENDPOINT) {
                contentType(ContentType.Application.Json)
                setBody(
                    buildJsonObject {
                        put("query", query)
                        put("variables", variables)
                    }
                )
            }
            .body()

    private val RECENT_AC_QUERY =
        """
        query recentAcSubmissions(${'$'}username: String!, ${'$'}limit: Int!) {
          recentAcSubmissionList(username: ${'$'}username, limit: ${'$'}limit) {
            titleSlug
            timestamp
          }
        }
        """
            .trimIndent()

    private val QUESTION_QUERY =
        """
        query questionDifficulty(${'$'}titleSlug: String!) {
          question(titleSlug: ${'$'}titleSlug) {
            difficulty
          }
        }
        """
            .trimIndent()

    @Serializable private data class RecentAcResponse(val data: RecentAcData)

    @Serializable
    private data class RecentAcData(val recentAcSubmissionList: List<RecentSubmission>)

    @Serializable private data class RecentSubmission(val titleSlug: String, val timestamp: String)

    @Serializable private data class QuestionResponse(val data: QuestionData)

    @Serializable private data class QuestionData(val question: QuestionDifficulty?)

    @Serializable private data class QuestionDifficulty(val difficulty: String)

    @Serializable
    @SerialName("leetcode")
    data class LeetCodeData(
        override val date: Long,
        val easy: Long,
        val medium: Long,
        val hard: Long,
    ) : IntegrationData()
}
