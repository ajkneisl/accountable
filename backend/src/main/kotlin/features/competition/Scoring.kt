package features.competition

import features.goals.GoalDefinition
import features.goals.GoalDirection
import features.goals.GoalPeriod
import features.goals.direction
import features.goals.isMet
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit

// How a shared goal is scored over one member's Monday-first week of per-day values. A weekly goal
// is judged on the week's total. A daily goal has to be met on every day: a big day can't cover for
// a missed one. Days of the week before the member was in the competition don't count.
//
// The app's competition/standings.ts and the web billboard's standings.ts mirror these rules, so
// the board, the leaderboard and the notifications always agree.

/**
 * The first day (0 = Monday) of the week starting at [weekStart] that counts for a member who's
 * been in the competition since [since]: the day they joined, if that falls inside the week, and
 * Monday otherwise.
 */
fun firstCountedDay(weekStart: Long, since: Long, zone: ZoneId): Int {
    val monday = Instant.ofEpochMilli(weekStart).atZone(zone).toLocalDate()
    val joined = Instant.ofEpochMilli(since).atZone(zone).toLocalDate()
    val days = ChronoUnit.DAYS.between(monday, joined)
    return if (days in 1..6) days.toInt() else 0
}

/** Whether a finished week's per-day [vals] (Monday first) meet [this] goal. */
fun GoalDefinition.metWeek(vals: List<Long>, firstDay: Int = 0): Boolean =
    if (period == GoalPeriod.DAILY) (firstDay until 7).all { isMet(vals[it]) }
    else isMet(vals.sum())

/**
 * Whether [this] goal is on pace on [weekday] (0 = Monday) of a week with per-day [vals] so far.
 *
 * A daily goal is on pace while it hasn't been missed on any day that's over. A limit is also
 * checked today, because once it's broken it can't be undone. A weekly goal is held to its target
 * spread over the days that are over (for a limit, the days through today).
 */
fun GoalDefinition.onPace(vals: List<Long>, weekday: Int, firstDay: Int = 0): Boolean {
    if (period == GoalPeriod.DAILY) {
        val through = if (direction == GoalDirection.AT_MOST) weekday + 1 else weekday
        return (firstDay until through).all { isMet(vals[it]) }
    }
    val total = vals.sum()
    return when (direction) {
        GoalDirection.AT_LEAST -> total * 7 >= target * weekday
        GoalDirection.AT_MOST -> total * 7 <= target * (weekday + 1)
    }
}
