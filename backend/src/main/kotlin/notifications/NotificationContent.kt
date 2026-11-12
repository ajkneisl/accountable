package notifications

import features.competition.Competition
import features.competition.competitionDetailView
import features.competition.competitionsFor
import features.competition.goalsForCompetition
import features.competition.membersOf
import features.goals.GoalDefinition
import features.goals.GoalDirection
import features.goals.GoalPeriod
import features.goals.currentWindow
import features.goals.direction
import features.goals.goalsFor
import features.goals.isMet
import features.goals.isRequiredOn
import features.goals.progressFor
import features.goals.weekValues
import features.goals.weekWindow
import features.habits.Habit
import features.habits.checkinsFor
import features.habits.habitStreak
import features.habits.habitsFor
import features.streak.streakFor
import integrations.ImportedWorkout
import integrations.api.startOfDay
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

/** A daily step goal counts as nearly met from this share of its target; a weekly one from more. */
private const val DAILY_CLOSE_PERCENT = 80
private const val WEEKLY_CLOSE_PERCENT = 90

/** Most items a notification lists before summing up the rest. */
private const val MAX_LISTED = 3

/**
 * How today's goals and habits stand, or null if the user has neither due. Daily goals count once
 * they're met (or, for a limit, while under it); weekly goals while they're on pace. What can still
 * be done today is listed apart from what can't.
 */
suspend fun goalsStatus(userID: UUID, now: Long): Push? {
    val zone = zoneOf(userID)
    val today = Instant.ofEpochMilli(now).atZone(zone).dayOfWeek
    val goals = goalsFor(userID).filter { it.isRequiredOn(today) }
    val habits = habitsFor(userID)
    if (goals.isEmpty() && habits.isEmpty()) return null
    val habitsLeft = habitsLeftToday(userID, habits, now, zone).map { it.first }

    val weekday = today.value - 1
    val behind = goals.mapNotNull { goal -> shortfall(goal, progressFor(userID, goal, now), weekday) }
    val (toGo, offTrack) = behind.partition { it.fixable }

    val body =
        if (behind.isEmpty() && habitsLeft.isEmpty()) {
            "Everything's on track today. Nice work."
        } else {
            buildList {
                    if (goals.isNotEmpty()) {
                        if (behind.isEmpty()) {
                            add("All ${goals.size} goals on track.")
                        } else {
                            add("${goals.size - behind.size} of ${goals.size} goals on track.")
                            if (toGo.isNotEmpty()) add("Still to go: ${listed(toGo.map { it.text })}.")
                            if (offTrack.isNotEmpty()) add("Off track: ${listed(offTrack.map { it.text })}.")
                        }
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
 * risk. The goal streak counts only when what's missing today can still be done (see
 * [fixableToday]); otherwise it's already lost, so it isn't nagged about.
 */
suspend fun streakRisk(userID: UUID, now: Long): Push? {
    val zone = zoneOf(userID)
    val lines = mutableListOf<String>()

    val goals = goalsFor(userID)
    val today = Instant.ofEpochMilli(now).atZone(zone).dayOfWeek
    val daily = goals.filter { it.period == GoalPeriod.DAILY && it.isRequiredOn(today) }
    if (daily.isNotEmpty()) {
        val unmet = daily.filterNot { it.isMet(progressFor(userID, it, now)) }
        val fixable = unmet.isNotEmpty() && unmet.all(::fixableToday)
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

        val placing = placingOf(competition, goals, userID, now, weeksAgo = 1, ::metWeek)
        val (me, rank, size, tiedWith, leader) = placing
        val hit = "${me.hits} of ${goals.size} goals hit"

        val body =
            when {
                rank == 1 && tiedWith.isEmpty() -> "You won last week with $hit."
                rank == 1 -> "You tied for 1st with ${listed(tiedWith)}, $hit."
                else ->
                    "You finished ${ordinal(rank)} of $size with $hit. " +
                        "${leader.username} took 1st with ${leader.hits}."
            }
        competitionPush(competition, body)
    }

/**
 * Where [userID] stands so far this week in each of their competitions that has goals and someone
 * to compete against. Ranked as on the board: by goals on pace, then streak.
 */
suspend fun competitionStandings(userID: UUID, now: Long): List<Push> {
    val weekday = Instant.ofEpochMilli(now).atZone(zoneOf(userID)).dayOfWeek.value - 1
    return competitionsFor(userID).mapNotNull { competition ->
        val goals = goalsForCompetition(competition.id)
        if (goals.isEmpty() || membersOf(competition.id).size < 2) return@mapNotNull null

        val placing =
            placingOf(competition, goals, userID, now, weeksAgo = 0) { goal, total ->
                onPace(goal, total, weekday)
            }
        val (me, rank, size, tiedWith, leader) = placing
        val pace = "on pace for ${me.hits} of ${goals.size} goals"

        val body =
            when {
                rank == 1 && tiedWith.isEmpty() -> "You're in 1st of $size, $pace."
                rank == 1 -> "You're tied for 1st with ${listed(tiedWith)}, $pace."
                else ->
                    "You're ${ordinal(rank)} of $size, $pace. " +
                        "${leader.username} leads with ${leader.hits}."
            }
        competitionPush(competition, body)
    }
}

/**
 * Progress on [userID]'s workout goals after [added], the workouts an import just brought in. Null
 * unless one of them was today (a backfill isn't news) and counts toward a goal that's due.
 */
suspend fun workoutProgress(userID: UUID, added: List<ImportedWorkout>, now: Long): Push? {
    val zone = zoneOf(userID)
    val dayStart = startOfDay(now, zone)
    val todays = added.filter { startOfDay(it.happenedAt, zone) == dayStart }
    if (todays.isEmpty()) return null

    val today = Instant.ofEpochMilli(now).atZone(zone).dayOfWeek
    val lines =
        goalsFor(userID)
            .filter { it.integration == "apple_fitness" && it.isRequiredOn(today) }
            .filter { goal ->
                when (goal.metric) {
                    "workouts" -> todays.any { it.durationMin >= (goal.minWorkoutMin ?: 0) }
                    "calories" -> todays.any { it.calories > 0 }
                    else -> false
                }
            }
            .map { goal ->
                val progress = progressFor(userID, goal, now)
                val period = if (goal.period == GoalPeriod.DAILY) "today" else "this week"
                val target = "${amount(goal, goal.target)} ${unit(goal, goal.target)} $period"
                if (goal.isMet(progress)) "You've hit your goal of $target."
                else "${amount(goal, progress)} of $target, ${amount(goal, goal.target - progress)} to go."
            }
    if (lines.isEmpty()) return null
    return Push("Workout logged", lines.joinToString(" "), path = "/goals", thread = "workout-progress")
}

/**
 * A nudge when one of [userID]'s step goals is nearly met, or null if none is, or it's already
 * gone out for that goal's current day or week.
 */
suspend fun stepsClose(userID: UUID, now: Long): Push? {
    val zone = zoneOf(userID)
    val today = Instant.ofEpochMilli(now).atZone(zone).dayOfWeek
    for (goal in goalsFor(userID)) {
        if (goal.integration != "apple_steps" || !goal.isRequiredOn(today)) continue
        val daily = goal.period == GoalPeriod.DAILY
        val progress = progressFor(userID, goal, now)
        val closeFrom = if (daily) DAILY_CLOSE_PERCENT else WEEKLY_CLOSE_PERCENT
        if (progress >= goal.target || progress * 100 < goal.target * closeFrom) continue
        val periodStart = currentWindow(goal.period, now, zone).first
        if (!claimSend(userID, "steps-close:${goal.period}", periodStart)) continue

        val left = goal.target - progress
        val body =
            "${amount(goal, left)} more ${unit(goal, left)} to reach " +
                "${amount(goal, goal.target)} ${if (daily) "today" else "this week"}."
        return Push("Almost at your step goal", body, path = "/goals", thread = "steps-close")
    }
    return null
}

private fun competitionPush(competition: Competition, body: String) =
    Push(
        competition.name,
        body,
        path = "/competition/${competition.id}",
        thread = "competition-${competition.id}",
    )

private data class Standing(val username: String, val isMe: Boolean, val hits: Int, val streak: Int) {
    fun beats(other: Standing) = hits > other.hits || (hits == other.hits && streak > other.streak)
}

/** Where one member placed: their [rank] among [size], who they're [tiedWith], and the [leader]. */
private data class Placing(
    val me: Standing,
    val rank: Int,
    val size: Int,
    val tiedWith: List<String>,
    val leader: Standing,
)

/**
 * Where [userID] places in [competition] for the week [weeksAgo] weeks back, each member's own
 * Monday to Sunday. [hit] decides whether a week's total counts for a goal; members are then ranked
 * by goals hit, then streak.
 */
private suspend fun placingOf(
    competition: Competition,
    goals: List<GoalDefinition>,
    userID: UUID,
    now: Long,
    weeksAgo: Int,
    hit: (GoalDefinition, Long) -> Boolean,
): Placing {
    val standings =
        competitionDetailView(competition)
            .members
            .map { member ->
                val id = UUID.fromString(member.userID)
                val zone = zoneOf(id)
                val (weekStart, _) = weekWindow(now, zone, weeksAgo)
                val hits = goals.count { hit(it, weekValues(id, it, weekStart, zone).sum()) }
                Standing(member.username, id == userID, hits, member.streak)
            }
            .sortedWith(compareByDescending<Standing> { it.hits }.thenByDescending { it.streak })

    val me = standings.first { it.isMe }
    return Placing(
        me = me,
        rank = 1 + standings.count { it.beats(me) },
        size = standings.size,
        tiedWith = standings.filter { !it.isMe && !it.beats(me) && !me.beats(it) }.map { it.username },
        leader = standings.first(),
    )
}

/**
 * Whether a week's [total] so far has [goal] on pace on [weekday] (0 = Monday), as the board
 * judges it: the weekly target spread over the days already over (for a limit, the days through
 * today). A daily goal is held to its target × 7.
 */
private fun onPace(goal: GoalDefinition, total: Long, weekday: Int): Boolean {
    val target = if (goal.period == GoalPeriod.WEEKLY) goal.target else goal.target * 7
    return when (goal.direction) {
        GoalDirection.AT_LEAST -> total * 7 >= target * weekday
        GoalDirection.AT_MOST -> total * 7 <= target * (weekday + 1)
    }
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
 * Whether a daily [goal] that's unmet can still be met today. A broken limit can't be undone, and
 * sleep counts toward the morning it ended, so by the time anything is sent today's is final.
 */
private fun fixableToday(goal: GoalDefinition): Boolean =
    goal.direction == GoalDirection.AT_LEAST && goal.integration != "apple_sleep"

/** How a goal is falling short: what's [fixable] says what's left, the rest just name the goal. */
private data class Shortfall(val text: String, val fixable: Boolean)

/**
 * How [goal] is falling short at [progress], or null if it's on track. [weekday] is today, 0 =
 * Monday, for a weekly goal's pace: the target spread over the days already over (for a limit, the
 * days through today).
 */
private fun shortfall(goal: GoalDefinition, progress: Long, weekday: Int): Shortfall? {
    if (goal.period == GoalPeriod.DAILY) {
        if (goal.isMet(progress)) return null
        return if (fixableToday(goal)) Shortfall(left(goal, goal.target - progress, today = true), true)
        else Shortfall(label(goal), false)
    }
    if (goal.direction == GoalDirection.AT_MOST) {
        return if (progress * 7 <= goal.target * (weekday + 1)) null else Shortfall(label(goal), false)
    }
    if (progress * 7 >= goal.target * weekday) return null
    return Shortfall(left(goal, goal.target - progress, today = false), true)
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

/** What a goal that's off track is called in a list. */
private fun label(goal: GoalDefinition): String =
    when (goal.integration) {
        "screen_time" -> "screen time"
        "apple_sleep" -> "sleep"
        else -> unit(goal, 2)
    }

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
