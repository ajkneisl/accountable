package features.feed

import api.Error
import api.suspendTransaction
import api.toEntity
import features.competition.Competitions
import features.competition.competitionsFor
import features.competition.goalsForCompetition
import features.competition.membersOf
import features.goals.GoalPeriod
import features.habits.HabitColor
import integrations.AppleFitness
import integrations.GitHub
import integrations.LeetCode
import integrations.LeetCodeSolve
import integrations.RepoCommits
import integrations.WorkoutType
import java.util.UUID
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.Op
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.greaterEq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.inList
import org.jetbrains.exposed.sql.SqlExpressionBuilder.less
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.compoundOr
import org.jetbrains.exposed.sql.exists
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.javatime.date
import org.jetbrains.exposed.sql.or
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import user.User
import user.Users
import user.displayColor

/**
 * Sources that post whenever there's activity. The rest (steps, sleep, screen time) accumulate or
 * arrive as one daily total, so they only post when a goal is met.
 */
internal val ACTIVITY_SOURCES = setOf(GitHub.name, LeetCode.name, AppleFitness.name)

/** One card: a person's day on a source, or a single workout. */
object FeedPosts : Table("feed_posts") {
    val id = uuid("id").clientDefault { UUID.randomUUID() }
    val actorID = uuid("actor_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val integration = varchar("integration", 32)

    /**
     * What makes the card unique for its actor: `github:2026-11-05` or `workout:<id>`. Uses the
     * local date rather than a start-of-day instant, so a timezone change can't duplicate a card.
     */
    val postKey = varchar("post_key", 64)

    /** The actor's local calendar date the card is about. */
    val day = date("day")

    /** JSON-encoded [FeedDetail]. */
    val detail = text("detail")

    /** When the card's activity first happened; compared against join dates. */
    val createdAt = long("created_at")

    /** When the card last gained something new. The feed sorts by this, so a growing card rises. */
    val lastActivityAt = long("last_activity_at")

    override val primaryKey = PrimaryKey(id)

    init {
        uniqueIndex("feed_posts_actor_key", actorID, postKey)
        index("feed_posts_actor_activity", false, actorID, lastActivityAt)
    }
}

/** A goal's standing as of a card, shown on it as a chip. */
object FeedPostGoals : Table("feed_post_goals") {
    val postID = uuid("post_id").references(FeedPosts.id, onDelete = ReferenceOption.CASCADE).index()

    /** The competition the goal belongs to; null for a personal goal, which only its owner sees. */
    val competitionID =
        uuid("competition_id")
            .references(Competitions.id, onDelete = ReferenceOption.CASCADE)
            .nullable()

    val metric = varchar("metric", 32)
    val period = enumerationByName("period", 16, GoalPeriod::class)
    val target = long("target")
    val value = long("value")
    val met = bool("met")
}

/**
 * A heart on a card. Unliking clears [active] rather than deleting the row, so that liking again
 * can tell it isn't the first time and doesn't send another push.
 */
object FeedLikes : Table("feed_likes") {
    val postID = uuid("post_id").references(FeedPosts.id, onDelete = ReferenceOption.CASCADE)
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val active = bool("active").default(true)
    val createdAt = long("created_at")

    override val primaryKey = PrimaryKey(postID, userID)
}

/** What a card says. One subclass per source; the discriminator is the source's name. */
@Serializable
sealed class FeedDetail {
    /** This detail without the specifics, for someone who has turned feed details off. */
    open fun totalsOnly(): FeedDetail = this

    /** A short description, for the like notification. */
    abstract fun summary(): String
}

/**
 * @param repos The busiest public repos.
 * @param otherCommits Commits not named in [repos]: quieter repos, private ones, and anything past
 *   the search's page size.
 */
@Serializable
@SerialName("github")
data class GitHubDetail(
    val commits: Long,
    val repos: List<RepoCommits>,
    val otherCommits: Long,
) : FeedDetail() {
    override fun totalsOnly() = copy(repos = emptyList(), otherCommits = commits)

    override fun summary() = plural(commits, "commit")
}

/**
 * @param solves The first few problems solved.
 * @param otherSolved Problems not named in [solves].
 */
@Serializable
@SerialName("leetcode")
data class LeetCodeDetail(
    val solved: Long,
    val solves: List<LeetCodeSolve>,
    val otherSolved: Long,
) : FeedDetail() {
    override fun totalsOnly() = copy(solves = emptyList(), otherSolved = solved)

    override fun summary() = "${plural(solved, "problem")} solved"
}

/**
 * The first three are null when the actor has turned details off: the card just says they worked
 * out. [manual] stays either way. It counts the same, but it's how competitors can tell the
 * difference, so it isn't one of the details a person can hide.
 */
@Serializable
@SerialName("apple_fitness")
data class WorkoutDetail(
    val workoutType: WorkoutType?,
    val durationMin: Long?,
    val calories: Long?,
    val manual: Boolean = false,
) : FeedDetail() {
    override fun totalsOnly() = WorkoutDetail(null, null, null, manual)

    override fun summary() = "workout"
}

@Serializable
@SerialName("apple_steps")
data class StepsDetail(val steps: Long) : FeedDetail() {
    override fun summary() = plural(steps, "step")
}

@Serializable
@SerialName("apple_sleep")
data class SleepDetail(val minutes: Long) : FeedDetail() {
    override fun summary() = "${duration(minutes)} of sleep"
}

@Serializable
@SerialName("screen_time")
data class ScreenTimeDetail(val minutes: Long) : FeedDetail() {
    override fun summary() = "${duration(minutes)} of screen time"
}

private fun plural(count: Long, noun: String) = "$count $noun${if (count == 1L) "" else "s"}"

private fun duration(minutes: Long) =
    if (minutes >= 60) "${minutes / 60}h ${minutes % 60}m" else "${minutes}m"

internal val feedJson = Json { ignoreUnknownKeys = true }

/** Who a card is by. */
@Serializable
data class FeedActor(val userID: String, val username: String, val color: HabitColor)

/** A goal's standing on a card. The competition fields are null for the viewer's own personal goal. */
@Serializable
data class FeedGoalChip(
    val competitionID: String?,
    val competitionName: String?,
    val metric: String,
    val period: GoalPeriod,
    val target: Long,
    val value: Long,
    val met: Boolean,
)

/** A card as one viewer sees it. */
@Serializable
data class FeedPostView(
    val id: String,
    val actor: FeedActor,
    val integration: String,
    /** The actor's local date, `YYYY-MM-DD`. */
    val day: String,
    val lastActivityAt: Long,
    val detail: FeedDetail,
    val goals: List<FeedGoalChip>,
    val likeCount: Long,
    val likedByMe: Boolean,
)

/** A page of the feed. Pass [nextCursor] as `before` for the next; null means that's everything. */
@Serializable data class FeedResponse(val posts: List<FeedPostView>, val nextCursor: String?)

/** A card's likes after liking or unliking it. */
@Serializable data class FeedLikeResponse(val likeCount: Long, val likedByMe: Boolean)

/** A competition [viewer] is in, as far as the feed cares. */
private class SharedCompetition(
    val id: UUID,
    val name: String,
    val joinedAt: Map<UUID, Long>,
    val goalKeys: Set<Triple<String, String, GoalPeriod>>,
) {
    val integrations = goalKeys.map { it.first }.toSet()
}

private suspend fun sharedCompetitions(viewer: UUID): List<SharedCompetition> =
    competitionsFor(viewer).map { competition ->
        SharedCompetition(
            id = competition.id,
            name = competition.name,
            joinedAt = membersOf(competition.id).associate { it.userID to it.joinedAt },
            goalKeys =
                goalsForCompetition(competition.id)
                    .map { Triple(it.integration, it.metric, it.period) }
                    .toSet(),
        )
    }

/**
 * Which cards [viewer] may see: their own, and for each competition they share with the actor, a
 * card on a source that competition has a goal on, from after both of them joined. A source that
 * only posts on a met goal also needs one of that competition's goals to be met on the card, so a
 * card earned by a private goal doesn't reach them. Evaluated on read so that leaving a competition
 * stops sharing with it straight away.
 */
private fun visibleTo(viewer: UUID, competitions: List<SharedCompetition>): Op<Boolean> {
    val rules =
        competitions.flatMap { competition ->
            val viewerJoined = competition.joinedAt.getValue(viewer)
            if (competition.integrations.isEmpty()) return@flatMap emptyList<Op<Boolean>>()
            competition.joinedAt
                .filterKeys { it != viewer }
                .map { (actor, actorJoined) ->
                    val earned =
                        exists(
                            FeedPostGoals.selectAll().where {
                                (FeedPostGoals.postID eq FeedPosts.id) and
                                    (FeedPostGoals.competitionID eq competition.id) and
                                    (FeedPostGoals.met eq true)
                            }
                        )
                    (FeedPosts.actorID eq actor) and
                        (FeedPosts.integration inList competition.integrations) and
                        (FeedPosts.createdAt greaterEq maxOf(viewerJoined, actorJoined)) and
                        ((FeedPosts.integration inList ACTIVITY_SOURCES) or earned)
                }
        }
    return (rules + (FeedPosts.actorID eq viewer)).compoundOr()
}

/** One page of [viewer]'s feed, newest activity first. */
suspend fun feedFor(viewer: UUID, before: FeedCursor?, limit: Int): FeedResponse {
    val competitions = sharedCompetitions(viewer)
    return suspendTransaction {
        var condition = visibleTo(viewer, competitions)
        if (before != null) {
            condition =
                condition and
                    ((FeedPosts.lastActivityAt less before.lastActivityAt) or
                        ((FeedPosts.lastActivityAt eq before.lastActivityAt) and
                            (FeedPosts.id less before.id)))
        }
        val rows =
            FeedPosts.selectAll()
                .where { condition }
                .orderBy(FeedPosts.lastActivityAt to SortOrder.DESC, FeedPosts.id to SortOrder.DESC)
                .limit(limit + 1)
                .toList()
        val page = rows.take(limit)
        val ids = page.map { it[FeedPosts.id] }

        val users =
            Users.selectAll()
                .where { Users.id inList page.map { it[FeedPosts.actorID] }.distinct() }
                .map { it.toEntity<User>() }
                .associateBy { it.id }
        val chips =
            FeedPostGoals.selectAll().where { FeedPostGoals.postID inList ids }.groupBy(
                { it[FeedPostGoals.postID] }
            ) {
                it
            }
        val likes =
            FeedLikes.selectAll()
                .where { (FeedLikes.postID inList ids) and (FeedLikes.active eq true) }
                .groupBy({ it[FeedLikes.postID] }) { it[FeedLikes.userID] }

        FeedResponse(
            posts =
                page.map { row ->
                    val id = row[FeedPosts.id]
                    val actor = users.getValue(row[FeedPosts.actorID])
                    val integration = row[FeedPosts.integration]
                    val mine = actor.id == viewer
                    val detail =
                        feedJson.decodeFromString(FeedDetail.serializer(), row[FeedPosts.detail])
                    val shared = competitions.filter { actor.id in it.joinedAt }

                    FeedPostView(
                        id = id.toString(),
                        actor =
                            FeedActor(actor.id.toString(), actor.username, actor.displayColor),
                        integration = integration,
                        day = row[FeedPosts.day].toString(),
                        lastActivityAt = row[FeedPosts.lastActivityAt],
                        detail = if (mine || actor.feedDetails) detail else detail.totalsOnly(),
                        goals =
                            chips[id].orEmpty().mapNotNull { chip ->
                                val competitionID = chip[FeedPostGoals.competitionID]
                                val competition = shared.find { it.id == competitionID }
                                val key =
                                    Triple(
                                        integration,
                                        chip[FeedPostGoals.metric],
                                        chip[FeedPostGoals.period],
                                    )
                                val visible =
                                    if (competitionID == null) mine
                                    else competition != null && key in competition.goalKeys
                                if (!visible) return@mapNotNull null
                                FeedGoalChip(
                                    competitionID = competition?.id?.toString(),
                                    competitionName = competition?.name,
                                    metric = chip[FeedPostGoals.metric],
                                    period = chip[FeedPostGoals.period],
                                    target = chip[FeedPostGoals.target],
                                    value = chip[FeedPostGoals.value],
                                    met = chip[FeedPostGoals.met],
                                )
                            },
                        likeCount = likes[id].orEmpty().size.toLong(),
                        likedByMe = viewer in likes[id].orEmpty(),
                    )
                },
            nextCursor =
                if (rows.size > limit) {
                    page.last().let { FeedCursor(it[FeedPosts.lastActivityAt], it[FeedPosts.id]) }
                        .encode()
                } else null,
        )
    }
}

/** A position in the feed: everything older than this card comes next. */
data class FeedCursor(val lastActivityAt: Long, val id: UUID) {
    fun encode() = "${lastActivityAt}_$id"

    companion object {
        /** Null if [raw] isn't a cursor from [encode]. */
        fun parse(raw: String): FeedCursor? {
            val at = raw.substringBefore('_').toLongOrNull() ?: return null
            val id = runCatching { UUID.fromString(raw.substringAfter('_')) }.getOrNull()
            return id?.let { FeedCursor(at, it) }
        }
    }
}

/** The result of [likePost]. [firstLike] is whether this person has never liked the card before. */
data class LikeResult(
    val likes: FeedLikeResponse,
    val firstLike: Boolean,
    val actorID: UUID,
    val detail: FeedDetail,
)

private fun notVisible(): Nothing = throw Error("That post does not exist.", 404)

/** The post's actor and detail if [viewer] may see it; otherwise a 404, whether it exists or not. */
private suspend fun requireVisible(viewer: UUID, postID: UUID): Pair<UUID, FeedDetail> {
    val competitions = sharedCompetitions(viewer)
    return suspendTransaction {
        FeedPosts.selectAll()
            .where { (FeedPosts.id eq postID) and visibleTo(viewer, competitions) }
            .limit(1)
            .firstOrNull()
            ?.let {
                it[FeedPosts.actorID] to
                    feedJson.decodeFromString(FeedDetail.serializer(), it[FeedPosts.detail])
            }
    } ?: notVisible()
}

private fun likesOn(postID: UUID, viewer: UUID): FeedLikeResponse {
    val likers =
        FeedLikes.selectAll()
            .where { (FeedLikes.postID eq postID) and (FeedLikes.active eq true) }
            .map { it[FeedLikes.userID] }
    return FeedLikeResponse(likers.size.toLong(), viewer in likers)
}

/** Heart a card. Idempotent. Hearts are for other people's cards, so your own is rejected. */
suspend fun likePost(viewer: UUID, postID: UUID): LikeResult {
    val (actor, detail) = requireVisible(viewer, postID)
    if (actor == viewer) Error.text("You can't like your own update.")
    return suspendTransaction {
        val updated =
            FeedLikes.update({ (FeedLikes.postID eq postID) and (FeedLikes.userID eq viewer) }) {
                it[FeedLikes.active] = true
            }
        if (updated == 0) {
            FeedLikes.insert {
                it[FeedLikes.postID] = postID
                it[FeedLikes.userID] = viewer
                it[FeedLikes.active] = true
                it[FeedLikes.createdAt] = System.currentTimeMillis()
            }
        }
        LikeResult(likesOn(postID, viewer), firstLike = updated == 0, actor, detail)
    }
}

/** Take back a heart. Idempotent. */
suspend fun unlikePost(viewer: UUID, postID: UUID): FeedLikeResponse {
    requireVisible(viewer, postID)
    return suspendTransaction {
        FeedLikes.update({ (FeedLikes.postID eq postID) and (FeedLikes.userID eq viewer) }) {
            it[FeedLikes.active] = false
        }
        likesOn(postID, viewer)
    }
}
