package features.competition

import features.goals.GoalDefinition
import features.goals.GoalDirection
import features.goals.GoalPeriod
import features.goals.direction
import features.goals.metricByDay
import features.goals.sumInRange
import features.goals.weekWindow
import java.util.UUID
import user.zoneOf

/** Most completed weeks the leaderboard looks back over. */
private const val MAX_LEADERBOARD_WEEKS = 104

/** One member's tally on a competition's [Leaderboard]. */
data class LeaderboardEntry(val userID: UUID, val weeksWon: Int)

/**
 * How often each member has finished a week first in a competition's standings.
 *
 * @param weeks Completed weeks counted, since the competition began.
 * @param entries Every member, most weeks won first.
 */
data class Leaderboard(val weeks: Int, val entries: List<LeaderboardEntry>)

/**
 * Whether a week's [total] meets [this] goal. A daily goal is held to seven days' worth, the way
 * the standings score a past week.
 */
private fun GoalDefinition.isMetOverWeek(total: Long): Boolean {
    val weekly = if (period == GoalPeriod.DAILY) target * 7 else target
    return when (direction) {
        GoalDirection.AT_LEAST -> total >= weekly
        GoalDirection.AT_MOST -> total <= weekly
    }
}

/**
 * Count the completed weeks each member of [competition] finished first in its standings: the most
 * shared goals met, and at least one. Members tied at the top each take the week; a week nobody met
 * a goal in has no winner.
 *
 * Weeks run from the one the competition was created in up to last week, each bucketed in the
 * member's own timezone like the week board, and are scored against the goals as they stand now. A
 * member is only in the running from the week they joined.
 */
suspend fun leaderboardFor(competition: Competition, now: Long): Leaderboard {
    val goals = goalsForCompetition(competition.id)
    val members = membersOf(competition.id)

    // Per member: goals met in each completed week they were part of, newest week first.
    val goalsMet = LinkedHashMap<UUID, List<Int>>()
    for (member in members) {
        val zone = zoneOf(member.userID)
        val since = maxOf(competition.createdAt, member.joinedAt)
        val weeks =
            (1..MAX_LEADERBOARD_WEEKS)
                .map { weekWindow(now, zone, it) }
                .takeWhile { (_, end) -> end > since }
        if (weeks.isEmpty() || goals.isEmpty()) {
            goalsMet[member.userID] = emptyList()
            continue
        }
        // One query per goal for the whole span, then each week is summed in memory.
        val spanStart = weeks.last().first
        val spanEnd = weeks.first().second
        val values = goals.map { it to metricByDay(member.userID, it, spanStart, spanEnd) }
        goalsMet[member.userID] =
            weeks.map { (start, end) ->
                values.count { (goal, byDay) -> goal.isMetOverWeek(byDay.sumInRange(start, end)) }
            }
    }

    val weeks = goalsMet.values.maxOfOrNull { it.size } ?: 0
    val won = members.associate { it.userID to 0 }.toMutableMap()
    for (week in 0 until weeks) {
        val scores = goalsMet.mapNotNull { (id, met) -> met.getOrNull(week)?.let { id to it } }
        val best = scores.maxOf { it.second }
        if (best == 0) continue
        scores.filter { it.second == best }.forEach { (id, _) -> won[id] = won.getValue(id) + 1 }
    }

    return Leaderboard(
        weeks = weeks,
        // Stable, so members level on wins stay in join order.
        entries =
            members
                .map { LeaderboardEntry(it.userID, won.getValue(it.userID)) }
                .sortedByDescending { it.weeksWon },
    )
}
