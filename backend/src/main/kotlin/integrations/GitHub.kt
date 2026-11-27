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
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import java.time.Instant
import java.util.UUID
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.upsert
import org.slf4j.LoggerFactory
import user.zoneOf

/** Per-day commit counts pulled from GitHub. */
object GitHubTable : IntegrationTable("integrations_github") {
    /** The day's commits in all, [privateCommits] included. */
    val commits = long("commits")

    /** Private contributions the user shares as a count on their GitHub profile; part of [commits]. */
    val privateCommits = long("private_commits").default(0)

    /** JSON list of [RepoCommits]: the day's public repos. Null on rows from before it existed. */
    val repos = text("repos").nullable()
}

/** Commits in one public repo on one day, for the feed. */
@Serializable data class RepoCommits(val repo: String, val commits: Long)

/** Most results one commit search returns; a busier day's remainder only counts in the total. */
private const val SEARCH_PAGE_SIZE = 100

object GitHub : Integration<GitHub.GitHubData> {
    private val log = LoggerFactory.getLogger(GitHub::class.java)

    override val name = "github"
    override val table = GitHubTable

    /** Mutable so tests can set one. GitHub's GraphQL API, and so private counts, need it. */
    internal var token: String? = System.getenv("GITHUB_TOKEN")

    /** Mutable so tests can swap in a `MockEngine`-backed client. */
    internal var client: HttpClient =
        HttpClient(CIO) { install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) } }

    /**
     * Counts the number of commits authored by [userID]'s linked GitHub account on the UTC
     * calendar day containing [date]. Uses the GitHub Search/commits API.
     */
    override suspend fun pullData(userID: UUID, date: Long): GitHubData = search(userID, date).data

    /**
     * The day's commit count and its per-repo breakdown. The commit search covers the repos the
     * server's token can see. A private one among them counts toward the total but is never named,
     * since the feed shows these names to other people. Other private work only shows up as the
     * count on the user's contribution graph, which [privateContributions] adds on.
     */
    private suspend fun search(userID: UUID, date: Long): DayCommits {
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
        val dayEnd = day.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
        // The private count is extra: if it can't be had, the day keeps the one it had, and the
        // public commits still come in.
        val private =
            runCatching { privateContributions(externalID, dayStart, dayEnd) }
                .onFailure { log.warn("private contributions failed for {} on {}", userID, day, it) }
                .getOrNull() ?: storedPrivateCommits(userID, dayStart)
        return DayCommits(
            data = GitHubData(date = dayStart, commits = response.totalCount + private),
            repos = repos,
            privateCommits = private,
        )
    }

    /**
     * How many contributions [login] made in [start, end) that the server's token can't see: the
     * private work GitHub shows as a bare count on their contribution graph. GitHub only shares it
     * if they've turned on "Include private contributions on my profile". 0 without a token, since
     * the GraphQL API needs one, or if there's no such user.
     */
    private suspend fun privateContributions(login: String, start: Long, end: Long): Long {
        val auth = token ?: return 0
        val body = buildJsonObject {
            put("query", PRIVATE_CONTRIBUTIONS_QUERY)
            putJsonObject("variables") {
                put("login", login)
                // Instant's ISO form always has seconds; GitHub turns "06:00Z" away.
                put("from", Instant.ofEpochMilli(start).toString())
                put("to", Instant.ofEpochMilli(end - 1).toString())
            }
        }
        val response: GraphQLResponse =
            client
                .post("https://api.github.com/graphql") {
                    bearerAuth(auth)
                    contentType(ContentType.Application.Json)
                    setBody(body)
                }
                .body()
        response.errors?.let { error("GitHub GraphQL: $it") }
        return response.data?.user?.contributionsCollection?.restrictedContributionsCount ?: 0
    }

    /** The private count stored for [userID]'s day starting [dayStart], or 0 if there's no row. */
    private suspend fun storedPrivateCommits(userID: UUID, dayStart: Long): Long = suspendTransaction {
        GitHubTable.select(GitHubTable.privateCommits)
            .where { (GitHubTable.userID eq userID) and (GitHubTable.date eq dayStart) }
            .firstOrNull()
            ?.get(GitHubTable.privateCommits) ?: 0
    }

    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<GitHubData> {
        val (data, repos, private) = search(userID, date)
        val now = System.currentTimeMillis()
        suspendTransaction {
            GitHubTable.upsert {
                it[GitHubTable.userID] = userID
                it[GitHubTable.date] = data.date
                it[GitHubTable.commits] = data.commits
                it[GitHubTable.privateCommits] = private
                it[GitHubTable.repos] = Json.encodeToString(repos)
                it[GitHubTable.fetchedAt] = now
            }
        }
        return IntegrationRecord(data, now)
    }

    /** One day from [search]: the counts, the public repos by name, and the private count. */
    private data class DayCommits(
        val data: GitHubData,
        val repos: List<RepoCommits>,
        val privateCommits: Long,
    )

    private const val PRIVATE_CONTRIBUTIONS_QUERY =
        "query(\$login: String!, \$from: DateTime!, \$to: DateTime!) { " +
            "user(login: \$login) { contributionsCollection(from: \$from, to: \$to) { " +
            "restrictedContributionsCount } } }"

    @Serializable
    private data class GraphQLResponse(val data: GraphQLData? = null, val errors: JsonArray? = null)

    @Serializable private data class GraphQLData(val user: GraphQLUser? = null)

    @Serializable
    private data class GraphQLUser(val contributionsCollection: ContributionsCollection? = null)

    @Serializable private data class ContributionsCollection(val restrictedContributionsCount: Long = 0)

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
