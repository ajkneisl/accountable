package features.streak

import features.goals.GoalDefinition
import features.goals.GoalPeriod
import features.goals.MS_PER_DAY
import features.goals.currentWindow
import features.goals.goalsFor
import features.goals.sumMetric
import integrations.api.startOfUtcDay
import java.util.UUID

/** Safety cap on how far back the streak walker will scan. */
private const val MAX_STREAK_DAYS = 366

/**
 * Count of consecutive UTC days ending at today where [userID] honored every entry in [goals].
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
 * @param floor Earliest UTC day-start (inclusive) the walker is allowed to consider. Defaults to
 *   no bound.
 */
suspend fun streakFor(
    userID: UUID,
    goals: List<GoalDefinition>,
    now: Long,
    floor: Long = Long.MIN_VALUE,
): Int {
    if (goals.isEmpty()) return 0

    val dailyGoals = goals.filter { it.period == GoalPeriod.DAILY }
    val weeklyGoals = goals.filter { it.period == GoalPeriod.WEEKLY }
    val currentWeekStart = currentWindow(GoalPeriod.WEEKLY, now).first

    var streak = 0
    var dayStart = startOfUtcDay(now)

    repeat(MAX_STREAK_DAYS) {
        if (dayStart < floor) return streak
        val dayEnd = dayStart + MS_PER_DAY

        val dailyPassed =
            dailyGoals.all { goal -> sumMetric(userID, goal, dayStart, dayEnd) >= goal.target }
        if (!dailyPassed) return streak

        if (dayStart < currentWeekStart) {
            val (weekStart, weekEnd) = currentWindow(GoalPeriod.WEEKLY, dayStart)
            val weeklyPassed =
                weeklyGoals.all { goal ->
                    sumMetric(userID, goal, weekStart, weekEnd) >= goal.target
                }
            if (!weeklyPassed) return streak
        }

        streak++
        dayStart -= MS_PER_DAY
    }
    return streak
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
 * Per-day pass/miss for the last [days] UTC days against the user's personal goals, oldest first.
 * Today is [DayStatus.TODAY] if its daily goals are already met, [DayStatus.MISS] otherwise.
 */
suspend fun streakHistory(userID: UUID, days: Int, now: Long): List<DayStatus> {
    require(days > 0) { "days must be positive" }
    val goals = goalsFor(userID)
    if (goals.isEmpty()) return List(days) { DayStatus.NONE }
    val dailyGoals = goals.filter { it.period == GoalPeriod.DAILY }
    val weeklyGoals = goals.filter { it.period == GoalPeriod.WEEKLY }
    val todayStart = startOfUtcDay(now)
    val currentWeekStart = currentWindow(GoalPeriod.WEEKLY, now).first

    return (days - 1 downTo 0).map { offset ->
        val dayStart = todayStart - offset * MS_PER_DAY
        val dayEnd = dayStart + MS_PER_DAY
        val dailyPassed =
            dailyGoals.all { goal -> sumMetric(userID, goal, dayStart, dayEnd) >= goal.target }
        val weeklyPassed =
            if (dayStart < currentWeekStart) {
                val (weekStart, weekEnd) = currentWindow(GoalPeriod.WEEKLY, dayStart)
                weeklyGoals.all { goal ->
                    sumMetric(userID, goal, weekStart, weekEnd) >= goal.target
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
