package features.habits

import api.MappedTable
import api.suspendTransaction
import api.toEntity
import java.time.LocalDate
import java.util.UUID
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.insertIgnore
import org.jetbrains.exposed.sql.javatime.date
import org.jetbrains.exposed.sql.selectAll
import user.Users

/** Longest allowed habit name, after trimming. */
const val HABIT_NAME_MAX = 40

/** Most habits a single user may track at once. */
const val MAX_HABITS = 20

/** Accent a habit's heatmap paints with. Mirrors the app's palette. */
@Serializable
enum class HabitColor {
    LIME,
    CORAL,
    INDIGO,
    INK,
}

/** Table that contains [Habit]. A user-defined, once-a-day thing they want to keep doing. */
object Habits : Table("habits") {
    val id = uuid("id").clientDefault { UUID.randomUUID() }
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE).index()
    val name = varchar("name", HABIT_NAME_MAX)
    val color = enumerationByName("color", 16, HabitColor::class)
    val createdAt = long("created_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(id)
}

/**
 * One row per (habit, day) the habit was done. Presence is the whole signal — there is no count.
 *
 * [day] is the user's local calendar date, not an instant: a check-in means "I did it on Tuesday",
 * so it must not move to another day if the user later changes timezone (unlike workouts, which
 * are re-bucketed from their timestamp).
 */
object HabitCheckins : Table("habit_checkins") {
    val habitID = uuid("habit_id").references(Habits.id, onDelete = ReferenceOption.CASCADE)
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val day = date("day")

    override val primaryKey = PrimaryKey(habitID, day)
}

/**
 * A habit a user tracks.
 *
 * @param id Habit ID.
 * @param userID Owner of the habit.
 * @param name Display name, 1–[HABIT_NAME_MAX] characters.
 * @param color Heatmap accent.
 * @param createdAt Ms epoch when the habit was created.
 */
@MappedTable(Habits::class)
data class Habit(
    val id: UUID,
    val userID: UUID,
    val name: String,
    val color: HabitColor,
    val createdAt: Long,
)

/** Create a habit for [userID]. */
suspend fun createHabit(userID: UUID, name: String, color: HabitColor): Habit = suspendTransaction {
    val habit = Habit(UUID.randomUUID(), userID, name, color, System.currentTimeMillis())
    Habits.insert {
        it[Habits.id] = habit.id
        it[Habits.userID] = userID
        it[Habits.name] = name
        it[Habits.color] = color
        it[Habits.createdAt] = habit.createdAt
    }
    habit
}

/** All habits owned by [userID], oldest first so the list order is stable as habits are added. */
suspend fun habitsFor(userID: UUID): List<Habit> = suspendTransaction {
    Habits.selectAll()
        .where { Habits.userID eq userID }
        .orderBy(Habits.createdAt, SortOrder.ASC)
        .map { it.toEntity<Habit>() }
}

/** A single habit, or null if [userID] doesn't own one with [habitID]. */
suspend fun habitFor(userID: UUID, habitID: UUID): Habit? = suspendTransaction {
    Habits.selectAll()
        .where { (Habits.id eq habitID) and (Habits.userID eq userID) }
        .limit(1)
        .firstOrNull()
        ?.toEntity<Habit>()
}

/** Delete a habit and (via cascade) its check-ins. Returns true if a row was removed. */
suspend fun deleteHabit(userID: UUID, habitID: UUID): Boolean = suspendTransaction {
    Habits.deleteWhere { it.run { (Habits.id eq habitID) and (Habits.userID eq userID) } } > 0
}

/** Mark [habitID] done ([done] = true) or not done on [day]. Idempotent either way. */
suspend fun setCheckin(userID: UUID, habitID: UUID, day: LocalDate, done: Boolean) =
    suspendTransaction {
        if (done) {
            HabitCheckins.insertIgnore {
                it[HabitCheckins.habitID] = habitID
                it[HabitCheckins.userID] = userID
                it[HabitCheckins.day] = day
            }
        } else {
            HabitCheckins.deleteWhere {
                it.run { (HabitCheckins.habitID eq habitID) and (HabitCheckins.day eq day) }
            }
        }
    }

/** Every check-in [userID] has between [from] and [to] (both inclusive), grouped by habit. */
suspend fun checkinsFor(userID: UUID, from: LocalDate, to: LocalDate): Map<UUID, Set<LocalDate>> =
    suspendTransaction {
        HabitCheckins.selectAll()
            .where {
                (HabitCheckins.userID eq userID) and
                    (HabitCheckins.day greaterEq from) and
                    (HabitCheckins.day lessEq to)
            }
            .groupBy({ it[HabitCheckins.habitID] }, { it[HabitCheckins.day] })
            .mapValues { (_, days) -> days.toSet() }
    }

/**
 * Consecutive days ending at [today] that the habit was done.
 *
 * An unchecked today doesn't break the streak — the day isn't over — so the count then starts from
 * yesterday instead.
 */
fun habitStreak(done: Set<LocalDate>, today: LocalDate): Int {
    var day = if (today in done) today else today.minusDays(1)
    var streak = 0
    while (day in done) {
        streak++
        day = day.minusDays(1)
    }
    return streak
}
