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
import java.time.Instant
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

    private const val ENDPOINT = "https://leetcode.com/graphql"

    // LeetCode's recentAcSubmissionList caps at 20; users solving more than that in a single
    // day will under-count. Acceptable for an MVP — revisit if it bites.
    private const val RECENT_LIMIT = 20

    /** Mutable so tests can swap in a `MockEngine`-backed client. */
    internal var client: HttpClient =
        HttpClient(CIO) { install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) } }

    override suspend fun pullData(userID: UUID, date: Long): LeetCodeData {
        val externalID = externalIDFor(userID, name)
        val dayStart = startOfUtcDay(date)
        val dayEnd = dayStart + MS_PER_DAY

        val recent: RecentAcResponse =
            graphql(
                RECENT_AC_QUERY,
                buildJsonObject {
                    put("username", externalID)
                    put("limit", RECENT_LIMIT)
                },
            )

        val solvedSlugs =
            recent.data.recentAcSubmissionList
                .filter {
                    val ms = it.timestamp.toLong() * 1000
                    ms in dayStart until dayEnd
                }
                .map { it.titleSlug }
                .distinct()

        var easy = 0L
        var medium = 0L
        var hard = 0L
        for (slug in solvedSlugs) {
            when (questionDifficulty(slug)) {
                "Easy" -> easy++
                "Medium" -> medium++
                "Hard" -> hard++
            }
        }

        return LeetCodeData(date = dayStart, easy = easy, medium = medium, hard = hard)
    }

    /** Pull and upsert. Shared by the daily cron and on-demand user-triggered refreshes. */
    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<LeetCodeData> {
        val data = pullData(userID, date)
        val now = System.currentTimeMillis()
        suspendTransaction {
            LeetCodeTable.upsert {
                it[LeetCodeTable.userID] = userID
                it[LeetCodeTable.date] = data.date
                it[LeetCodeTable.easy] = data.easy
                it[LeetCodeTable.medium] = data.medium
                it[LeetCodeTable.hard] = data.hard
                it[LeetCodeTable.fetchedAt] = now
            }
        }
        return IntegrationRecord(data, now)
    }

    override suspend fun getDay(userID: UUID, date: Long): IntegrationRecord<LeetCodeData>? =
        suspendTransaction {
            val dayStart = startOfUtcDay(date)
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

    suspend fun history(userID: UUID): List<LeetCodeData> = suspendTransaction {
        LeetCodeTable.selectAll()
            .where { LeetCodeTable.userID eq userID }
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
