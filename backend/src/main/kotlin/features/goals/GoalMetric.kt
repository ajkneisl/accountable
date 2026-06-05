package features.goals

import api.suspendTransaction
import integrations.AppleFitnessTable
import integrations.GitHubTable
import integrations.LeetCodeTable
import integrations.api.IntegrationTable
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import org.jetbrains.exposed.sql.Column
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.selectAll
import user.zoneOf

const val MS_PER_DAY = 24L * 60 * 60 * 1000

/** Ms-epoch of the start of [this] local date in [zone]. */
private fun LocalDate.startMs(zone: ZoneId): Long =
    atStartOfDay(zone).toInstant().toEpochMilli()

/** The local date in [zone] containing the ms-epoch [now]. */
private fun localDate(now: Long, zone: ZoneId): LocalDate =
    Instant.ofEpochMilli(now).atZone(zone).toLocalDate()

/**
 * A metric a [Goal] can track. Pairs a provider name + metric key with the [IntegrationTable]
 * column whose per-day values get summed to compute progress.
 */
data class GoalMetric(
    val integration: String,
    val metric: String,
    val table: IntegrationTable,
    val column: Column<Long>,
)

/** Registry of every metric a user is allowed to set a goal against. */
object GoalMetrics {
    val all: List<GoalMetric> =
        listOf(
            GoalMetric("github", "commits", GitHubTable, GitHubTable.commits),
            GoalMetric("leetcode", "easy", LeetCodeTable, LeetCodeTable.easy),
            GoalMetric("leetcode", "medium", LeetCodeTable, LeetCodeTable.medium),
            GoalMetric("leetcode", "hard", LeetCodeTable, LeetCodeTable.hard),
            GoalMetric(
                "apple_fitness",
                "workouts",
                AppleFitnessTable,
                AppleFitnessTable.workouts,
            ),
            GoalMetric(
                "apple_fitness",
                "calories",
                AppleFitnessTable,
                AppleFitnessTable.calories,
            ),
        )

    val byKey: Map<Pair<String, String>, GoalMetric> =
        all.associateBy { it.integration to it.metric }
}

/**
 * Start (inclusive) and end (exclusive) ms-epoch bounds of the current [period] window containing
 * [now], evaluated in [zone]. Daily windows are that local calendar day; weekly windows start on
 * the local Monday. Computed via calendar arithmetic so DST transitions stay correct.
 */
fun currentWindow(period: GoalPeriod, now: Long, zone: ZoneId): Pair<Long, Long> {
    val date = localDate(now, zone)
    return when (period) {
        GoalPeriod.DAILY -> date.startMs(zone) to date.plusDays(1).startMs(zone)
        GoalPeriod.WEEKLY -> {
            val daysFromMonday = (date.dayOfWeek.value - DayOfWeek.MONDAY.value).toLong()
            val monday = date.minusDays(daysFromMonday)
            monday.startMs(zone) to monday.plusWeeks(1).startMs(zone)
        }
    }
}

/**
 * Sum [goal]'s metric column over [start, end). Returns 0 if the metric is not registered or no
 * rows fall in the window.
 */
suspend fun sumMetric(userID: UUID, goal: GoalDefinition, start: Long, end: Long): Long {
    val metric = GoalMetrics.byKey[goal.integration to goal.metric] ?: return 0L
    return suspendTransaction {
        metric.table
            .selectAll()
            .where {
                (metric.table.userID eq userID) and
                    (metric.table.date greaterEq start) and
                    (metric.table.date less end)
            }
            .sumOf { it[metric.column] }
    }
}

/**
 * Every per-day value of [goal]'s metric with row date in [start, end), keyed by start-of-day epoch.
 * One query covering the whole range; absent days are simply missing (treat as 0).
 *
 * This is the batched alternative to calling [sumMetric] once per day: callers that need to evaluate
 * many consecutive days (streaks, history) fetch the range once and aggregate in memory via
 * [sumInRange] instead of issuing a transaction per day.
 */
suspend fun metricByDay(
    userID: UUID,
    goal: GoalDefinition,
    start: Long,
    end: Long,
): Map<Long, Long> {
    val metric = GoalMetrics.byKey[goal.integration to goal.metric] ?: return emptyMap()
    return suspendTransaction {
        metric.table
            .selectAll()
            .where {
                (metric.table.userID eq userID) and
                    (metric.table.date greaterEq start) and
                    (metric.table.date less end)
            }
            .associate { it[metric.table.date] to it[metric.column] }
    }
}

/** Sum the values whose day key falls in [start, end). Mirrors [sumMetric] over an in-memory map. */
fun Map<Long, Long>.sumInRange(start: Long, end: Long): Long =
    entries.sumOf { (date, value) -> if (date in start until end) value else 0L }

/**
 * Sum [goal]'s metric column over its current [GoalPeriod] window. Returns 0 if the metric is not
 * registered or no rows exist in the window.
 */
suspend fun progressFor(userID: UUID, goal: Goal, now: Long): Long {
    val (start, end) = currentWindow(goal.period, now, zoneOf(userID))
    return sumMetric(userID, goal, start, end)
}

/**
 * Per-day metric values for the last [days] UTC days, oldest first. Missing days are 0. Single
 * query against the goal's integration table.
 */
suspend fun perDayValues(userID: UUID, goal: GoalDefinition, days: Int, now: Long): List<Long> {
    require(days > 0) { "days must be positive" }
    val zone = zoneOf(userID)
    val today = localDate(now, zone)
    val windowStart = today.minusDays((days - 1).toLong()).startMs(zone)
    val windowEnd = today.plusDays(1).startMs(zone)

    val byDay = metricByDay(userID, goal, windowStart, windowEnd)

    return (days - 1 downTo 0).map { offset ->
        byDay[today.minusDays(offset.toLong()).startMs(zone)] ?: 0L
    }
}
