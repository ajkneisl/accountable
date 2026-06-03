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
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.http.HttpHeaders
import io.ktor.serialization.kotlinx.json.json
import java.time.Instant
import java.util.UUID
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.upsert
import user.zoneOf

/** Per-day commit counts pulled from GitHub. */
object GitHubTable : IntegrationTable("integrations_github") {
    val commits = long("commits")
}

object GitHub : Integration<GitHub.GitHubData> {
    override val name = "github"

    private val token: String? = System.getenv("GITHUB_TOKEN")

    /** Mutable so tests can swap in a `MockEngine`-backed client. */
    internal var client: HttpClient =
        HttpClient(CIO) { install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) } }

    /**
     * Counts the number of commits authored by [userID]'s linked GitHub account on the UTC
     * calendar day containing [date]. Uses the GitHub Search/commits API.
     */
    override suspend fun pullData(userID: UUID, date: Long): GitHubData {
        val externalID = externalIDFor(userID, name)
        val zone = zoneOf(userID)
        val dayStart = startOfDay(date, zone)
        val day = Instant.ofEpochMilli(dayStart).atZone(zone).toLocalDate()
        val query = "author:$externalID author-date:$day"

        val response: SearchCommitsResponse =
            client
                .get("https://api.github.com/search/commits") {
                    parameter("q", query)
                    parameter("per_page", 1)
                    header(HttpHeaders.Accept, "application/vnd.github+json")
                    header("X-GitHub-Api-Version", "2022-11-28")
                    token?.let { bearerAuth(it) }
                }
                .body()

        return GitHubData(date = dayStart, commits = response.totalCount)
    }

    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<GitHubData> {
        val data = pullData(userID, date)
        val now = System.currentTimeMillis()
        suspendTransaction {
            GitHubTable.upsert {
                it[GitHubTable.userID] = userID
                it[GitHubTable.date] = data.date
                it[GitHubTable.commits] = data.commits
                it[GitHubTable.fetchedAt] = now
            }
        }
        return IntegrationRecord(data, now)
    }

    override suspend fun getDay(userID: UUID, date: Long): IntegrationRecord<GitHubData>? {
        val dayStart = startOfDay(date, zoneOf(userID))
        return suspendTransaction {
            GitHubTable.selectAll()
                .where { (GitHubTable.userID eq userID) and (GitHubTable.date eq dayStart) }
                .limit(1)
                .firstOrNull()
                ?.let {
                    IntegrationRecord(
                        data =
                            GitHubData(
                                date = it[GitHubTable.date],
                                commits = it[GitHubTable.commits],
                            ),
                        fetchedAt = it[GitHubTable.fetchedAt],
                    )
                }
        }
    }

    /** Full per-day history for a user, most-recent day first. */
    suspend fun history(userID: UUID): List<GitHubData> = suspendTransaction {
        GitHubTable.selectAll()
            .where { GitHubTable.userID eq userID }
            .orderBy(GitHubTable.date, SortOrder.DESC)
            .map { GitHubData(date = it[GitHubTable.date], commits = it[GitHubTable.commits]) }
    }

    @Serializable
    private data class SearchCommitsResponse(@SerialName("total_count") val totalCount: Long)

    @Serializable
    @SerialName("github")
    data class GitHubData(override val date: Long, val commits: Long) : IntegrationData()
}
