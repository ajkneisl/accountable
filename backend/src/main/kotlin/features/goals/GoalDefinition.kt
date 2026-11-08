package features.goals

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
}
