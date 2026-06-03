package features.goals

import api.suspendTransaction
import integrations.GitHubTable
import integrations.LeetCodeTable
import integrations.api.IntegrationTable
import integrations.api.startOfUtcDay
import java.time.DayOfWeek
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID
import org.jetbrains.exposed.sql.Column
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.selectAll

const val MS_PER_DAY = 24L * 60 * 60 * 1000

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
        )

    val byKey: Map<Pair<String, String>, GoalMetric> =
        all.associateBy { it.integration to it.metric }
}

/**
 * Start (inclusive) and end (exclusive) ms-epoch bounds of the current [period] window containing
 * [now]. Weekly windows start on Monday in UTC.
 */
fun currentWindow(period: GoalPeriod, now: Long): Pair<Long, Long> {
    val today = startOfUtcDay(now)
    return when (period) {
        GoalPeriod.DAILY -> today to today + MS_PER_DAY
        GoalPeriod.WEEKLY -> {
            val date = Instant.ofEpochMilli(today).atOffset(ZoneOffset.UTC).toLocalDate()
            val daysFromMonday = (date.dayOfWeek.value - DayOfWeek.MONDAY.value).toLong()
            val monday = date.minusDays(daysFromMonday)
            val start = monday.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
            start to start + 7 * MS_PER_DAY
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
 * Sum [goal]'s metric column over its current [GoalPeriod] window. Returns 0 if the metric is not
 * registered or no rows exist in the window.
 */
suspend fun progressFor(userID: UUID, goal: Goal, now: Long): Long {
    val (start, end) = currentWindow(goal.period, now)
    return sumMetric(userID, goal, start, end)
}

/**
 * Per-day metric values for the last [days] UTC days, oldest first. Missing days are 0. Single
 * query against the goal's integration table.
 */
suspend fun perDayValues(userID: UUID, goal: GoalDefinition, days: Int, now: Long): List<Long> {
    require(days > 0) { "days must be positive" }
    val metric = GoalMetrics.byKey[goal.integration to goal.metric] ?: return List(days) { 0L }
    val todayStart = startOfUtcDay(now)
    val windowStart = todayStart - (days - 1) * MS_PER_DAY
    val windowEnd = todayStart + MS_PER_DAY

    val byDay: Map<Long, Long> = suspendTransaction {
        metric.table
            .selectAll()
            .where {
                (metric.table.userID eq userID) and
                    (metric.table.date greaterEq windowStart) and
                    (metric.table.date less windowEnd)
            }
            .associate { it[metric.table.date] to it[metric.column] }
    }

    return (days - 1 downTo 0).map { offset -> byDay[todayStart - offset * MS_PER_DAY] ?: 0L }
}
