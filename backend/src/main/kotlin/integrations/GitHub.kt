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
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.upsert
import user.zoneOf

/** Per-day commit counts pulled from GitHub. */
object GitHubTable : IntegrationTable("integrations_github") {
    val commits = long("commits")

    /** JSON list of [RepoCommits]: the day's public repos. Null on rows from before it existed. */
    val repos = text("repos").nullable()
}

/** Commits in one public repo on one day, for the feed. */
@Serializable data class RepoCommits(val repo: String, val commits: Long)

/** Most results one commit search returns; a busier day's remainder only counts in the total. */
private const val SEARCH_PAGE_SIZE = 100

object GitHub : Integration<GitHub.GitHubData> {
    override val name = "github"
    override val table = GitHubTable

    private val token: String? = System.getenv("GITHUB_TOKEN")

    /** Mutable so tests can swap in a `MockEngine`-backed client. */
    internal var client: HttpClient =
        HttpClient(CIO) { install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) } }

    /**
     * Counts the number of commits authored by [userID]'s linked GitHub account on the UTC
     * calendar day containing [date]. Uses the GitHub Search/commits API.
     */
    override suspend fun pullData(userID: UUID, date: Long): GitHubData = search(userID, date).first

    /**
     * The day's commit count and its per-repo breakdown, from one request. A private repo the
     * server's token can see counts toward the total but is never named, since the feed shows
     * these names to other people.
     */
    private suspend fun search(userID: UUID, date: Long): Pair<GitHubData, List<RepoCommits>> {
        val externalID = externalIDFor(userID, name)
        val zone = zoneOf(userID)
        val dayStart = startOfDay(date, zone)
        val day = Instant.ofEpochMilli(dayStart).atZone(zone).toLocalDate()
        val query = "author:$externalID author-date:$day"

        val response: SearchCommitsResponse =
            client
                .get("https://api.github.com/search/commits") {
                    parameter("q", query)
                    parameter("per_page", SEARCH_PAGE_SIZE)
                    header(HttpHeaders.Accept, "application/vnd.github+json")
                    header("X-GitHub-Api-Version", "2022-11-28")
                    token?.let { bearerAuth(it) }
                }
                .body()

        val repos =
            response.items
                .filterNot { it.repository.private }
                .groupingBy { it.repository.fullName }
                .eachCount()
                .map { (repo, commits) -> RepoCommits(repo, commits.toLong()) }
                .sortedWith(compareByDescending<RepoCommits> { it.commits }.thenBy { it.repo })
        return GitHubData(date = dayStart, commits = response.totalCount) to repos
    }

    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<GitHubData> {
        val (data, repos) = search(userID, date)
        val now = System.currentTimeMillis()
        suspendTransaction {
            GitHubTable.upsert {
                it[GitHubTable.userID] = userID
                it[GitHubTable.date] = data.date
                it[GitHubTable.commits] = data.commits
                it[GitHubTable.repos] = Json.encodeToString(repos)
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

    override suspend fun history(userID: UUID, since: Long): List<GitHubData> = suspendTransaction {
        GitHubTable.selectAll()
            .where { (GitHubTable.userID eq userID) and (GitHubTable.date greaterEq since) }
            .orderBy(GitHubTable.date, SortOrder.DESC)
            .map { GitHubData(date = it[GitHubTable.date], commits = it[GitHubTable.commits]) }
    }

    @Serializable
    private data class SearchCommitsResponse(
        @SerialName("total_count") val totalCount: Long,
        val items: List<SearchCommit> = emptyList(),
    )

    @Serializable private data class SearchCommit(val repository: SearchRepository)

    @Serializable
    private data class SearchRepository(
        @SerialName("full_name") val fullName: String,
        val private: Boolean = false,
    )

    @Serializable
    @SerialName("github")
    data class GitHubData(override val date: Long, val commits: Long) : IntegrationData()
}
