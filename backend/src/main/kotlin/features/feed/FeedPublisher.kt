package features.feed

import api.suspendTransaction
import features.competition.competitionsFor
import features.competition.goalsForCompetition
import features.goals.GoalDefinition
import features.goals.GoalDirection
import features.goals.GoalPeriod
import features.goals.currentWindow
import features.goals.direction
import features.goals.goalsFor
import features.goals.isMet
import features.goals.metricByDay
import features.goals.sumInRange
import integrations.AppleFitness
import integrations.AppleFitnessWorkouts
import integrations.AppleSleep
import integrations.AppleSleepTable
import integrations.AppleSteps
import integrations.AppleStepsTable
import integrations.GitHub
import integrations.GitHubTable
import integrations.LeetCode
import integrations.LeetCodeSolve
import integrations.LeetCodeTable
import integrations.RepoCommits
import integrations.ScreenTime
import integrations.WorkoutSource
import integrations.ScreenTimeTable
import integrations.api.IntegrationTable
import io.ktor.util.logging.KtorSimpleLogger
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.batchInsert
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insertIgnore
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import user.zoneOf

private val log = KtorSimpleLogger("FeedPublisher")

/** A workout older than this doesn't post, so importing years of history can't flood the feed. */
private const val WORKOUT_LOOKBACK_MS = 48L * 60 * 60 * 1000

/** How many repos or problems a card names before summing up the rest. */
private const val NAMED_ITEMS = 3

/**
 * Bring [userID]'s cards up to date after their data changed. A failure is only logged: the feed
 * must never break the sync that triggered it, and the next sync catches up.
 */
suspend fun publishFeed(userID: UUID, now: Long = System.currentTimeMillis()) {
    runCatching { syncFeedPosts(userID, now) }
        .onFailure { log.warn("feed publish failed: user=$userID", it) }
}

/** A goal, and the competition it's from; null means it's personal. */
private data class FeedGoal(val competitionID: UUID?, val definition: GoalDefinition)

/** A goal's standing on a card, and whether this card is where it was reached. */
private data class Chip(
    val goal: FeedGoal,
    val value: Long,
    val met: Boolean,
    val reachedOnThisDay: Boolean,
)

private data class Draft(
    val integration: String,
    val key: String,
    val day: LocalDate,
    val detail: FeedDetail,
    val happenedAt: Long,
    val chips: List<Chip>,
)

/**
 * Create, update or remove [userID]'s cards so they match their current data. Idempotent. Today and
 * yesterday are both checked because sleep and LeetCode data can arrive after the day it's for.
 * A source without a goal doesn't post, and its existing cards are left as they are.
 */
suspend fun syncFeedPosts(userID: UUID, now: Long = System.currentTimeMillis()) {
    val goals = feedGoalsOf(userID)
    if (goals.isEmpty()) return

    val zone = zoneOf(userID)
    val today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
    val evaluator = GoalEvaluator(userID, zone, now)
    val drafts = mutableListOf<Draft>()
    val retracted = mutableListOf<String>()

    for ((integration, sourceGoals) in goals.groupBy { it.definition.integration }) {
        if (integration == AppleFitness.name) {
            drafts += workoutDrafts(userID, sourceGoals, zone, now)
            continue
        }
        for (day in listOf(today, today.minusDays(1))) {
            val dayStart = day.atStartOfDay(zone).toInstant().toEpochMilli()
            // No row means no data: not a zero, which would pass a limit goal.
            val detail = dayDetail(integration, userID, dayStart) ?: continue
            val chips = sourceGoals.map { evaluator.chip(it, day) }
            val key = "$integration:$day"
            val earned =
                if (integration in ACTIVITY_SOURCES) detail.hasActivity()
                else chips.any { it.reachedOnThisDay }
            if (earned) {
                // A finished day that only just turned up (late sleep data) dates from its end.
                val happenedAt = minOf(now, day.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli())
                drafts += Draft(integration, key, day, detail, happenedAt, chips)
            } else {
                retracted += key
            }
        }
    }
    save(userID, drafts, retracted, now)
}

private fun FeedDetail.hasActivity(): Boolean =
    when (this) {
        is GitHubDetail -> commits > 0
        is LeetCodeDetail -> solved > 0
        else -> true
    }

private suspend fun feedGoalsOf(userID: UUID): List<FeedGoal> =
    goalsFor(userID).map { FeedGoal(null, it) } +
        competitionsFor(userID).flatMap { competition ->
            goalsForCompetition(competition.id).map { FeedGoal(competition.id, it) }
        }

/** The card's content for one day of a source, or null if there's no data for that day. */
private suspend fun dayDetail(integration: String, userID: UUID, dayStart: Long): FeedDetail? {
    fun IntegrationTable.dayRow(): ResultRow? =
        selectAll().where { (this@dayRow.userID eq userID) and (date eq dayStart) }.firstOrNull()

    return suspendTransaction {
        when (integration) {
            GitHub.name -> GitHubTable.dayRow()?.let { githubDetail(it) }
            LeetCode.name -> LeetCodeTable.dayRow()?.let { leetCodeDetail(it) }
            AppleSteps.name -> AppleStepsTable.dayRow()?.let { StepsDetail(it[AppleStepsTable.steps]) }
            AppleSleep.name -> AppleSleepTable.dayRow()?.let { SleepDetail(it[AppleSleepTable.minutes]) }
            ScreenTime.name -> ScreenTimeTable.dayRow()?.let { ScreenTimeDetail(it[ScreenTimeTable.minutes]) }
            else -> null
        }
    }
}

private fun githubDetail(row: ResultRow): GitHubDetail {
    val commits = row[GitHubTable.commits]
    val named =
        row[GitHubTable.repos]
            ?.let { feedJson.decodeFromString<List<RepoCommits>>(it) }
            .orEmpty()
            .take(NAMED_ITEMS)
    return GitHubDetail(commits, named, (commits - named.sumOf { it.commits }).coerceAtLeast(0))
}

private fun leetCodeDetail(row: ResultRow): LeetCodeDetail {
    val solved = row[LeetCodeTable.easy] + row[LeetCodeTable.medium] + row[LeetCodeTable.hard]
    val named =
        row[LeetCodeTable.solves]
            ?.let { feedJson.decodeFromString<List<LeetCodeSolve>>(it) }
            .orEmpty()
            .take(NAMED_ITEMS)
    return LeetCodeDetail(solved, named, (solved - named.size).coerceAtLeast(0))
}

/**
 * One card per recent workout. Reads the workouts themselves rather than the daily rollup, so each
 * card's goals stand as of that workout: the morning's run stays 1/5 after the evening's lift.
 */
private suspend fun workoutDrafts(
    userID: UUID,
    goals: List<FeedGoal>,
    zone: ZoneId,
    now: Long,
): List<Draft> {
    val cutoff = now - WORKOUT_LOOKBACK_MS
    // Back to the start of the oldest card's week, which its weekly goals count from.
    val since = currentWindow(GoalPeriod.WEEKLY, cutoff, zone).first
    val history =
        suspendTransaction {
                AppleFitnessWorkouts.selectAll()
                    .where {
                        (AppleFitnessWorkouts.userID eq userID) and
                            (AppleFitnessWorkouts.happenedAt greaterEq since)
                    }
                    .toList()
            }
            // The ID settles a tie, so workouts at the same moment still number the same each sync.
            .sortedWith(
                compareBy(
                    { it[AppleFitnessWorkouts.happenedAt] },
                    { it[AppleFitnessWorkouts.id].toString() },
                )
            )

    return history.mapIndexedNotNull { index, row ->
        val happenedAt = row[AppleFitnessWorkouts.happenedAt]
        if (happenedAt < cutoff) return@mapIndexedNotNull null
        val upToThisOne = history.subList(0, index + 1)
        Draft(
            integration = AppleFitness.name,
            key = workoutKey(row[AppleFitnessWorkouts.id]),
            day = Instant.ofEpochMilli(happenedAt).atZone(zone).toLocalDate(),
            detail =
                WorkoutDetail(
                    row[AppleFitnessWorkouts.type],
                    row[AppleFitnessWorkouts.durationMin],
                    row[AppleFitnessWorkouts.calories],
                    manual = row[AppleFitnessWorkouts.entrySource] == WorkoutSource.MANUAL,
                ),
            happenedAt = minOf(now, happenedAt),
            chips = goals.map { workoutChip(it, upToThisOne, happenedAt, zone) },
        )
    }
}

/** Where [goal] stood once the last of [upToThisOne], which happened at [happenedAt], was done. */
private fun workoutChip(
    goal: FeedGoal,
    upToThisOne: List<ResultRow>,
    happenedAt: Long,
    zone: ZoneId,
): Chip {
    val definition = goal.definition
    val windowStart = currentWindow(definition.period, happenedAt, zone).first
    val inWindow = upToThisOne.filter { it[AppleFitnessWorkouts.happenedAt] >= windowStart }
    val value =
        if (definition.metric == "calories") inWindow.sumOf { it[AppleFitnessWorkouts.calories] }
        else inWindow.size.toLong()
    val met = definition.isMet(value)
    return Chip(goal, value, met, met)
}

private fun workoutKey(workoutID: UUID) = "workout:$workoutID"

/** Works out where goals stood on a given day, reading each metric's window only once. */
private class GoalEvaluator(val userID: UUID, val zone: ZoneId, val now: Long) {
    private val windows = mutableMapOf<List<Any>, Map<Long, Long>>()

    suspend fun chip(goal: FeedGoal, day: LocalDate): Chip {
        val definition = goal.definition
        val dayStart = day.atStartOfDay(zone).toInstant().toEpochMilli()
        val dayEnd = day.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
        val (windowStart, windowEnd) = currentWindow(definition.period, dayStart, zone)
        val values =
            // Keyed on both ends: on a Monday, a day and its week start at the same moment.
            windows.getOrPut(listOf(definition.integration, definition.metric, windowStart, windowEnd)) {
                metricByDay(userID, definition, windowStart, windowEnd)
            }
        val value = values.sumInRange(windowStart, dayEnd)

        return when (definition.direction) {
            GoalDirection.AT_LEAST -> {
                val met = definition.isMet(value)
                val before = values.sumInRange(windowStart, dayStart)
                Chip(goal, value, met, met && !definition.isMet(before))
            }
            // A limit can still be broken until its window ends, so it isn't met before then. A
            // weekly limit is reached on the week's last day, only if that day has data; earlier
            // days in the week with no data count as zero, as they do on the goal's own card.
            GoalDirection.AT_MOST -> {
                val met = windowEnd <= now && dayEnd == windowEnd && definition.isMet(value)
                Chip(goal, value, met, met)
            }
        }
    }
}

/** Write [drafts] and remove [retracted], in one transaction so a card and its chips stay in step. */
private suspend fun save(
    userID: UUID,
    drafts: List<Draft>,
    retracted: List<String>,
    now: Long,
) = suspendTransaction {
    if (retracted.isNotEmpty()) {
        FeedPosts.deleteWhere {
            it.run { (FeedPosts.actorID eq userID) and (FeedPosts.postKey inList retracted) }
        }
    }
    if (drafts.isEmpty()) return@suspendTransaction

    val existing =
        FeedPosts.selectAll()
            .where { (FeedPosts.actorID eq userID) and (FeedPosts.postKey inList drafts.map { it.key }) }
            .associate { it[FeedPosts.postKey] to (it[FeedPosts.id] to it[FeedPosts.detail]) }

    for (draft in drafts) {
        val detail = feedJson.encodeToString(FeedDetail.serializer(), draft.detail)
        val current = existing[draft.key]
        val postID =
            if (current == null) {
                FeedPosts.insertIgnore {
                    it[FeedPosts.actorID] = userID
                    it[FeedPosts.integration] = draft.integration
                    it[FeedPosts.postKey] = draft.key
                    it[FeedPosts.day] = draft.day
                    it[FeedPosts.detail] = detail
                    it[FeedPosts.createdAt] = draft.happenedAt
                    it[FeedPosts.lastActivityAt] = draft.happenedAt
                }
                // Read back rather than trust the insert: a concurrent sync may have won the race.
                FeedPosts.selectAll()
                    .where { (FeedPosts.actorID eq userID) and (FeedPosts.postKey eq draft.key) }
                    .single()[FeedPosts.id]
            } else {
                val (id, previous) = current
                // Only real news moves a card: a chip changing on its own doesn't.
                if (previous != detail) {
                    FeedPosts.update({ FeedPosts.id eq id }) {
                        it[FeedPosts.detail] = detail
                        it[FeedPosts.lastActivityAt] = now
                    }
                }
                id
            }

        FeedPostGoals.deleteWhere { it.run { FeedPostGoals.postID eq postID } }
        FeedPostGoals.batchInsert(draft.chips) { chip ->
            this[FeedPostGoals.postID] = postID
            this[FeedPostGoals.competitionID] = chip.goal.competitionID
            this[FeedPostGoals.metric] = chip.goal.definition.metric
            this[FeedPostGoals.period] = chip.goal.definition.period
            this[FeedPostGoals.target] = chip.goal.definition.target
            this[FeedPostGoals.value] = chip.value
            this[FeedPostGoals.met] = chip.met
        }
    }
}

/** Remove a deleted workout's card, along with its likes. */
suspend fun deleteWorkoutPost(userID: UUID, workoutID: UUID) = suspendTransaction {
    FeedPosts.deleteWhere {
        it.run { (FeedPosts.actorID eq userID) and (FeedPosts.postKey eq workoutKey(workoutID)) }
    }
}
