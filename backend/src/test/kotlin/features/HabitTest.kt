package com.accountable.features

import features.goals.dayMask
import features.habits.HabitCheckins
import features.habits.HabitColor
import features.habits.Habits
import features.habits.checkinsFor
import features.habits.createHabit
import features.habits.deleteHabit
import features.habits.habitStreak
import features.habits.habitsView
import features.habits.setCheckin
import features.habits.updateHabit
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.transactions.transaction
import user.RefreshTokens
import user.Users

class HabitTest {
    private val testUserID = UUID.randomUUID()
    private val zone = ZoneId.of("America/Chicago")
    private val today: LocalDate
        get() = Instant.now().atZone(zone).toLocalDate()

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:habit-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens, Habits, HabitCheckins)
            HabitCheckins.deleteAll()
            Habits.deleteAll()
            RefreshTokens.deleteAll()
            Users.deleteAll()

            Users.insert {
                it[id] = testUserID
                it[username] = "alice"
                it[email] = "alice@example.com"
                it[password] = "x"
                it[createdAt] = System.currentTimeMillis()
                it[timezone] = "America/Chicago"
            }
        }
    }

    @Test
    fun `streak counts back from today`() {
        val day = LocalDate.of(2026, 10, 12)
        val done = setOf(day, day.minusDays(1), day.minusDays(2), day.minusDays(4))
        assertEquals(3, habitStreak(done, day))
    }

    @Test
    fun `unchecked today does not break the streak`() {
        val day = LocalDate.of(2026, 10, 12)
        assertEquals(2, habitStreak(setOf(day.minusDays(1), day.minusDays(2)), day))
        assertEquals(0, habitStreak(setOf(day.minusDays(2)), day))
    }

    @Test
    fun `weekday habit streak skips the weekend`() {
        // 2026-10-12 is a Monday.
        val monday = LocalDate.of(2026, 10, 12)
        val weekdays = dayMask(listOf(0, 1, 2, 3, 4))
        val done = setOf(monday, monday.minusDays(3), monday.minusDays(4))
        assertEquals(3, habitStreak(done, monday, weekdays))
        assertEquals(1, habitStreak(done, monday))
    }

    @Test
    fun `rest days neither break nor add to a streak`() {
        val saturday = LocalDate.of(2026, 10, 17)
        val weekdays = dayMask(listOf(0, 1, 2, 3, 4))
        // Done Thu, Fri and Saturday itself: Saturday doesn't count, Thu + Fri do.
        val done = setOf(saturday, saturday.minusDays(1), saturday.minusDays(2))
        assertEquals(2, habitStreak(done, saturday, weekdays))
        // Unchecked on a rest day: the streak through Friday stands.
        assertEquals(2, habitStreak(done - saturday, saturday, weekdays))
    }

    @Test
    fun `habit schedule round-trips through the view`() = runBlocking {
        val habit = createHabit(testUserID, "Gym", HabitColor.TEAL, dayMask(listOf(0, 2, 4)))
        assertEquals(listOf(0, 2, 4), habitsView(testUserID, 7).habits.single().requiredDays)

        assertTrue(updateHabit(testUserID, habit.id, null, null, dayMask(listOf(5, 6))))
        assertEquals(listOf(5, 6), habitsView(testUserID, 7).habits.single().requiredDays)
    }

    @Test
    fun `checking in twice is idempotent and unchecking removes it`() = runBlocking {
        val habit = createHabit(testUserID, "Read", HabitColor.LIME)
        val day = LocalDate.of(2026, 10, 1)

        setCheckin(testUserID, habit.id, day, true)
        setCheckin(testUserID, habit.id, day, true)
        assertEquals(setOf(day), checkinsFor(testUserID, day, day)[habit.id])

        setCheckin(testUserID, habit.id, day, false)
        assertTrue(checkinsFor(testUserID, day, day).isEmpty())
    }

    @Test
    fun `view window ends today and lines up with start`() = runBlocking {
        val habit = createHabit(testUserID, "Stretch", HabitColor.CORAL)
        setCheckin(testUserID, habit.id, today, true)
        setCheckin(testUserID, habit.id, today.minusDays(1), true)
        setCheckin(testUserID, habit.id, today.minusDays(6), true)

        val view = habitsView(testUserID, 7)
        assertEquals(today.toString(), view.today)
        assertEquals(today.minusDays(6).toString(), view.start)

        val h = view.habits.single()
        assertEquals(listOf(true, false, false, false, false, true, true), h.done)
        assertEquals(3, h.total)
        assertEquals(2, h.streak)
    }

    @Test
    fun `streak reaches past the heatmap window`() = runBlocking {
        val habit = createHabit(testUserID, "Walk", HabitColor.INDIGO)
        repeat(10) { setCheckin(testUserID, habit.id, today.minusDays(it.toLong()), true) }

        val h = habitsView(testUserID, 7).habits.single()
        assertEquals(7, h.total)
        assertEquals(10, h.streak)
    }

    @Test
    fun `updating a habit keeps its history`() = runBlocking {
        val habit = createHabit(testUserID, "Read", HabitColor.LIME)
        setCheckin(testUserID, habit.id, today, true)

        assertTrue(updateHabit(testUserID, habit.id, "Read 20 pages", null))
        assertTrue(updateHabit(testUserID, habit.id, null, HabitColor.CORAL))
        assertFalse(updateHabit(UUID.randomUUID(), habit.id, "Nope", null))

        val h = habitsView(testUserID, 7).habits.single()
        assertEquals("Read 20 pages", h.name)
        assertEquals(HabitColor.CORAL, h.color)
        assertEquals(1, h.total)
    }

    @Test
    fun `deleting a habit removes its check-ins`() = runBlocking {
        val habit = createHabit(testUserID, "Meditate", HabitColor.INK)
        setCheckin(testUserID, habit.id, today, true)

        assertTrue(deleteHabit(testUserID, habit.id))
        assertTrue(checkinsFor(testUserID, today, today).isEmpty())
        assertTrue(habitsView(testUserID, 7).habits.isEmpty())
    }
}
