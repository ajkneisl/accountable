package features.streak

import features.goals.GoalDefinition
import features.goals.GoalPeriod
import features.goals.currentWindow
import features.goals.goalsFor
import features.goals.metricByDay
import features.goals.sumInRange
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import user.zoneOf

/** Safety cap on how far back the streak walker will scan. */
private const val MAX_STREAK_DAYS = 366

/**
 * Count of consecutive days (in [userID]'s timezone) ending at today where they honored every
 * entry in [goals].
 *
 * Walks backward day by day from today. A day [D] counts iff:
 * - every daily goal's metric on [D] reached its target, AND
 * - if [D] is in a *completed* week (i.e. before this week), every weekly goal's metric summed
 *   across that week reached its target.
 *
 * Weekly goals for the current (in-progress) week never break the streak — they're still being
 * worked on. The walk also stops once [dayStart] would dip below [floor], which lets competition
 * streaks bound themselves to a member's join date. Empty [goals] returns 0.
 *
 * @param floor Earliest day-start (inclusive) the walker is allowed to consider. Defaults to
 *   no bound.
 */
suspend fun streakFor(
    userID: UUID,
    goals: List<GoalDefinition>,
    now: Long,
    floor: Long = Long.MIN_VALUE,
): Int {
    if (goals.isEmpty()) return 0

    val zone = zoneOf(userID)
    val dailyGoals = goals.filter { it.period == GoalPeriod.DAILY }
    val weeklyGoals = goals.filter { it.period == GoalPeriod.WEEKLY }
    val currentWeekStart = currentWindow(GoalPeriod.WEEKLY, now, zone).first

    val today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
    // Pull every goal's per-day values for the whole scannable range up front (one query each),
    // then walk in memory — avoids a transaction per (goal, day).
    val (dailyValues, weeklyValues) =
        loadMetricWindows(userID, today, MAX_STREAK_DAYS, dailyGoals, weeklyGoals, zone)

    var streak = 0
    var day = today

    repeat(MAX_STREAK_DAYS) {
        val dayStart = startMs(day, zone)
        if (dayStart < floor) return streak
        val dayEnd = startMs(day.plusDays(1), zone)

        val dailyPassed =
            dailyGoals.all { goal -> dailyValues.getValue(goal).sumInRange(dayStart, dayEnd) >= goal.target }
        if (!dailyPassed) return streak

        if (dayStart < currentWeekStart) {
            val (weekStart, weekEnd) = currentWindow(GoalPeriod.WEEKLY, dayStart, zone)
            val weeklyPassed =
                weeklyGoals.all { goal ->
                    weeklyValues.getValue(goal).sumInRange(weekStart, weekEnd) >= goal.target
                }
            if (!weeklyPassed) return streak
        }

        streak++
        day = day.minusDays(1)
    }
    return streak
}

/** Ms-epoch of the start of [date] in [zone]. */
private fun startMs(date: LocalDate, zone: ZoneId): Long =
    date.atStartOfDay(zone).toInstant().toEpochMilli()

/**
 * Fetch each goal's per-day metric values covering the last [days] days ending at [today], widened
 * back to the Monday of the earliest day so weekly windows are fully covered. One query per goal.
 */
private suspend fun loadMetricWindows(
    userID: UUID,
    today: LocalDate,
    days: Int,
    dailyGoals: List<GoalDefinition>,
    weeklyGoals: List<GoalDefinition>,
    zone: ZoneId,
): Pair<Map<GoalDefinition, Map<Long, Long>>, Map<GoalDefinition, Map<Long, Long>>> {
    val earliestDay = today.minusDays((days - 1).toLong())
    val queryStart = currentWindow(GoalPeriod.WEEKLY, startMs(earliestDay, zone), zone).first
    val queryEnd = startMs(today.plusDays(1), zone)
    val dailyValues = dailyGoals.associateWith { metricByDay(userID, it, queryStart, queryEnd) }
    val weeklyValues = weeklyGoals.associateWith { metricByDay(userID, it, queryStart, queryEnd) }
    return dailyValues to weeklyValues
}

/** [userID]'s streak against their personal goals. */
suspend fun currentStreak(userID: UUID, now: Long): Int =
    streakFor(userID, goalsFor(userID), now)

/** Per-day outcome reported by [streakHistory]. */
enum class DayStatus {
    /** Every goal applicable to this day was met. */
    ON,
    /** At least one goal applicable to this day was missed. */
    MISS,
    /** The current UTC day — outcome depends on goal progress so far. */
    TODAY,
    /** The user had no goals to evaluate. */
    NONE,
}

/**
 * Per-day pass/miss for the last [days] days (in the user's timezone) against their personal
 * goals, oldest first.
 * Today is [DayStatus.TODAY] if its daily goals are already met, [DayStatus.MISS] otherwise.
 */
suspend fun streakHistory(userID: UUID, days: Int, now: Long): List<DayStatus> {
    require(days > 0) { "days must be positive" }
    val goals = goalsFor(userID)
    if (goals.isEmpty()) return List(days) { DayStatus.NONE }
    val zone = zoneOf(userID)
    val dailyGoals = goals.filter { it.period == GoalPeriod.DAILY }
    val weeklyGoals = goals.filter { it.period == GoalPeriod.WEEKLY }
    val today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
    val currentWeekStart = currentWindow(GoalPeriod.WEEKLY, now, zone).first
    val (dailyValues, weeklyValues) =
        loadMetricWindows(userID, today, days, dailyGoals, weeklyGoals, zone)

    return (days - 1 downTo 0).map { offset ->
        val day = today.minusDays(offset.toLong())
        val dayStart = startMs(day, zone)
        val dayEnd = startMs(day.plusDays(1), zone)
        val dailyPassed =
            dailyGoals.all { goal -> dailyValues.getValue(goal).sumInRange(dayStart, dayEnd) >= goal.target }
        val weeklyPassed =
            if (dayStart < currentWeekStart) {
                val (weekStart, weekEnd) = currentWindow(GoalPeriod.WEEKLY, dayStart, zone)
                weeklyGoals.all { goal ->
                    weeklyValues.getValue(goal).sumInRange(weekStart, weekEnd) >= goal.target
                }
            } else true

        when {
            !dailyPassed -> DayStatus.MISS
            !weeklyPassed -> DayStatus.MISS
            offset == 0 -> DayStatus.TODAY
            else -> DayStatus.ON
        }
    }
}
