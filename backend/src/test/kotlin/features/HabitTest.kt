package com.accountable.features

import features.habits.HabitCheckins
import features.habits.HabitColor
import features.habits.Habits
import features.habits.checkinsFor
import features.habits.createHabit
import features.habits.deleteHabit
import features.habits.habitStreak
import features.habits.habitsView
import features.habits.setCheckin
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
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
    fun `deleting a habit removes its check-ins`() = runBlocking {
        val habit = createHabit(testUserID, "Meditate", HabitColor.INK)
        setCheckin(testUserID, habit.id, today, true)

        assertTrue(deleteHabit(testUserID, habit.id))
        assertTrue(checkinsFor(testUserID, today, today).isEmpty())
        assertTrue(habitsView(testUserID, 7).habits.isEmpty())
    }
}
