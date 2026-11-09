package features.goals

import java.time.DayOfWeek

/** A [GoalDefinition.requiredDays] mask with all seven days set. */
const val EVERY_DAY = 0b1111111

/**
 * The minimum shape needed to evaluate a goal: which metric to track and how often / how much.
 * Implemented by personal [Goal]s and competition goals so both flow through the same streak and
 * progress calculations.
 */
interface GoalDefinition {
    val integration: String
    val metric: String
    val period: GoalPeriod
    val target: Long

    /**
     * For a workouts goal, the fewest minutes a workout must last to count toward it; null counts
     * every workout.
     */
    val minWorkoutMin: Long?
        get() = null

    /**
     * The weekdays a daily goal has to be met on, one bit per day with Monday lowest. On other days
     * nothing is due: they neither break a streak nor add to one.
     */
    val requiredDays: Int
        get() = EVERY_DAY
}

/** Whether this goal is due on [day]. A weekly goal isn't tied to particular days, so always. */
fun GoalDefinition.isRequiredOn(day: DayOfWeek): Boolean =
    period != GoalPeriod.DAILY || requiredDays and (1 shl (day.value - 1)) != 0

/** [days] (0 = Monday … 6 = Sunday) as a [GoalDefinition.requiredDays] mask. */
fun dayMask(days: List<Int>): Int = days.fold(0) { mask, day -> mask or (1 shl day) }

/** The days set in [mask], as [dayMask] takes them. */
fun daysIn(mask: Int): List<Int> = (0..6).filter { mask and (1 shl it) != 0 }
