package notifications

import features.competition.competitionDetailView
import features.competition.competitionsFor
import features.competition.goalsForCompetition
import features.competition.membersOf
import features.goals.GoalDefinition
import features.goals.GoalDirection
import features.goals.GoalPeriod
import features.goals.direction
import features.goals.goalsFor
import features.goals.isMet
import features.goals.progressFor
import features.goals.weekValues
import features.goals.weekWindow
import features.habits.Habit
import features.habits.checkinsFor
import features.habits.habitStreak
import features.habits.habitsFor
import features.streak.streakFor
import java.time.Instant
import java.time.ZoneId
import java.util.Locale
import java.util.UUID
import kotlin.math.roundToLong
import user.zoneOf

// What each scheduled notification says. Pace and standings follow the app's rules
// (frontend/app/src/features/dashboard/types.ts and competition/standings.ts), so a
// notification never disagrees with the screen it opens.

/** A streak shorter than this isn't worth a reminder. */
private const val MIN_STREAK = 2

/** Most items a notification lists before summing up the rest. */
private const val MAX_LISTED = 3

/**
 * How today's goals and habits stand, or null if the user has neither. Daily goals count once
 * they're met (or, for a limit, while under it); weekly goals while they're on pace.
 */
suspend fun goalsStatus(userID: UUID, now: Long): Push? {
    val zone = zoneOf(userID)
    val goals = goalsFor(userID)
    val habits = habitsFor(userID)
    if (goals.isEmpty() && habits.isEmpty()) return null
    val habitsLeft = habitsLeftToday(userID, habits, now, zone).map { it.first }

    val weekday = Instant.ofEpochMilli(now).atZone(zone).dayOfWeek.value - 1
    val behind = goals.mapNotNull { goal -> shortfall(goal, progressFor(userID, goal, now), weekday) }

    val body =
        if (behind.isEmpty() && habitsLeft.isEmpty()) {
            "Everything's on track today. Nice work."
        } else {
            buildList {
                    if (goals.isNotEmpty()) {
                        val onTrack = goals.size - behind.size
                        add(
                            if (behind.isEmpty()) "All ${goals.size} goals on track."
                            else "$onTrack of ${goals.size} goals on track. Still to go: ${listed(behind)}."
                        )
                    }
                    if (habitsLeft.isNotEmpty()) add("Habits left: ${listed(habitsLeft)}.")
                    else if (habits.isNotEmpty()) add("Every habit's done.")
                }
                .joinToString(" ")
        }
    return Push("Goals check-in", body, path = "/goals", thread = "goals-status")
}

/**
 * A reminder for streaks that end at midnight unless today is finished, or null if none are at
 * risk. The goal streak counts only when what's missing today can still be done: a daily limit
 * that's already been broken can't be undone, so it isn't nagged about.
 */
suspend fun streakRisk(userID: UUID, now: Long): Push? {
    val zone = zoneOf(userID)
    val lines = mutableListOf<String>()

    val goals = goalsFor(userID)
    val daily = goals.filter { it.period == GoalPeriod.DAILY }
    if (daily.isNotEmpty()) {
        val unmet = daily.filterNot { it.isMet(progressFor(userID, it, now)) }
        val fixable = unmet.isNotEmpty() && unmet.all { it.direction == GoalDirection.AT_LEAST }
        // Today is unfinished, so this is the run ending yesterday.
        val streak = if (fixable) streakFor(userID, goals, now) else 0
        if (streak >= MIN_STREAK) {
            val missing = unmet.map { left(it, it.target - progressFor(userID, it, now), today = true) }
            lines += "Your $streak-day goal streak ends at midnight: ${listed(missing)} to go."
        }
    }

    val habits =
        habitsLeftToday(userID, habitsFor(userID), now, zone).filter { it.second >= MIN_STREAK }
    if (habits.isNotEmpty()) {
        val names = listed(habits.map { (name, streak) -> "$name ($streak days)" })
        lines += if (habits.size == 1) "$names isn't done yet today." else "$names aren't done yet today."
    }

    if (lines.isEmpty()) return null
    val path = if (habits.isNotEmpty() && lines.size == 1) "/habits" else "/goals"
    return Push("Keep your streak alive", lines.joinToString(" "), path = path, thread = "streak-risk")
}

/**
 * Where [userID] finished last week in each of their competitions that has goals and someone to
 * compete against. Members are ranked as on the board: by goals hit, then streak.
 */
suspend fun competitionRecaps(userID: UUID, now: Long): List<Push> =
    competitionsFor(userID).mapNotNull { competition ->
        val goals = goalsForCompetition(competition.id)
        val members = membersOf(competition.id)
        if (goals.isEmpty() || members.size < 2) return@mapNotNull null

        val detail = competitionDetailView(competition)
        val standings =
            detail.members
                .map { member ->
                    val id = UUID.fromString(member.userID)
                    val zone = zoneOf(id)
                    val (weekStart, _) = weekWindow(now, zone, 1)
                    val hits = goals.count { metWeek(it, weekValues(id, it, weekStart, zone).sum()) }
                    Standing(member.username, id == userID, hits, member.streak)
                }
                .sortedWith(compareByDescending<Standing> { it.hits }.thenByDescending { it.streak })

        val me = standings.first { it.isMe }
        val rank = 1 + standings.count { it.beats(me) }
        val tiedWith = standings.filter { !it.isMe && !it.beats(me) && !me.beats(it) }
        val leader = standings.first()
        val hit = "${me.hits} of ${goals.size} goals hit"

        val body =
            when {
                rank == 1 && tiedWith.isEmpty() -> "You won last week with $hit."
                rank == 1 -> "You tied for 1st with ${listed(tiedWith.map { it.username })}, $hit."
                else ->
                    "You finished ${ordinal(rank)} of ${standings.size} with $hit. " +
                        "${leader.username} took 1st with ${leader.hits}."
            }
        Push(
            competition.name,
            body,
            path = "/competition/${competition.id}",
            thread = "competition-${competition.id}",
        )
    }

private data class Standing(val username: String, val isMe: Boolean, val hits: Int, val streak: Int) {
    fun beats(other: Standing) = hits > other.hits || (hits == other.hits && streak > other.streak)
}

/** Whether a finished week's [total] met [goal]; a daily goal is held to its target × 7. */
private fun metWeek(goal: GoalDefinition, total: Long): Boolean {
    val target = if (goal.period == GoalPeriod.WEEKLY) goal.target else goal.target * 7
    return when (goal.direction) {
        GoalDirection.AT_LEAST -> total >= target
        GoalDirection.AT_MOST -> total <= target
    }
}

/**
 * What [goal] still needs at [progress], or null if it's on track. [weekday] is today, 0 = Monday,
 * for a weekly goal's pace: the target spread over the days already over (for a limit, the days
 * through today).
 */
private fun shortfall(goal: GoalDefinition, progress: Long, weekday: Int): String? {
    val limit = goal.direction == GoalDirection.AT_MOST
    if (goal.period == GoalPeriod.DAILY) {
        if (goal.isMet(progress)) return null
        return if (limit) "${label(goal)} over today's limit" else left(goal, goal.target - progress, today = true)
    }
    if (limit) {
        return if (progress * 7 <= goal.target * (weekday + 1)) null else "${label(goal)} over pace"
    }
    if (progress * 7 >= goal.target * weekday) return null
    return left(goal, goal.target - progress, today = false)
}

/** "3,100 more steps" (today) or "2 workouts this week". */
private fun left(goal: GoalDefinition, remaining: Long, today: Boolean): String {
    val amount = amount(goal, remaining)
    val unit = unit(goal, remaining)
    return if (today) "$amount more $unit" else "$amount $unit this week"
}

/** [value] in the metric's display units: hours to a tenth for minute metrics, else a count. */
private fun amount(goal: GoalDefinition, value: Long): String {
    if (!inMinutes(goal)) return String.format(Locale.US, "%,d", value)
    val tenths = (value / 6.0).roundToLong()
    return if (tenths % 10 == 0L) (tenths / 10).toString() else "${tenths / 10}.${tenths % 10}"
}

private fun inMinutes(goal: GoalDefinition) =
    goal.metric == "minutes" && (goal.integration == "apple_sleep" || goal.integration == "screen_time")

/** Mirrors the app's unitLabel, singular for exactly one. */
private fun unit(goal: GoalDefinition, value: Long): String {
    val one = !inMinutes(goal) && value == 1L
    return when {
        goal.integration == "github" -> if (one) "commit" else "commits"
        goal.integration == "leetcode" -> if (one) "${goal.metric} problem" else "${goal.metric} problems"
        goal.metric == "workouts" -> if (one) "workout" else "workouts"
        goal.metric == "calories" -> "calories"
        goal.integration == "apple_sleep" -> "hours of sleep"
        goal.metric == "steps" -> if (one) "step" else "steps"
        inMinutes(goal) -> "hours"
        else -> goal.metric
    }
}

/** What a limit goal is called in a sentence. */
private fun label(goal: GoalDefinition): String =
    if (goal.integration == "screen_time") "Screen time" else unit(goal, 2).replaceFirstChar { it.uppercase() }

/** Each habit not checked off today, with its streak through yesterday. */
private suspend fun habitsLeftToday(
    userID: UUID,
    habits: List<Habit>,
    now: Long,
    zone: ZoneId,
): List<Pair<String, Int>> {
    if (habits.isEmpty()) return emptyList()
    val today = Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
    val done = checkinsFor(userID, today.minusDays(366), today)
    return habits.mapNotNull { habit ->
        val days = done[habit.id].orEmpty()
        if (today in days) null else habit.name to habitStreak(days, today)
    }
}

/** "a, b and c", or the first [MAX_LISTED] and "N more". */
private fun listed(items: List<String>): String {
    val shown = if (items.size > MAX_LISTED) items.take(MAX_LISTED - 1) else items
    val rest = items.size - shown.size
    val all = if (rest > 0) shown + "$rest more" else shown
    return if (all.size == 1) all[0] else all.dropLast(1).joinToString(", ") + " and " + all.last()
}

private fun ordinal(n: Int): String {
    val suffix =
        if (n % 100 in 11..13) "th"
        else
            when (n % 10) {
                1 -> "st"
                2 -> "nd"
                3 -> "rd"
                else -> "th"
            }
    return "$n$suffix"
}
