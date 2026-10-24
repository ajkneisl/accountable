package com.accountable.features

import features.goals.GoalPeriod
import features.goals.Goals
import features.goals.deleteGoal
import features.goals.goalFor
import features.goals.updateGoal
import features.goals.upsertGoal
import features.habits.HabitColor
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.Users
import user.createUser

class GoalTest {
    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:goal-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, Goals)
            Goals.deleteAll()
            Users.deleteAll()
        }
    }

    private fun newUser(): UUID =
        createUser("u${UUID.randomUUID().toString().take(8)}", "${UUID.randomUUID()}@e.com", "hash", "UTC").id

    @Test
    fun `new goals have no color`() = runBlocking {
        val goal = upsertGoal(newUser(), "github", "commits", GoalPeriod.DAILY, 1)
        assertNull(goal.color)
    }

    @Test
    fun `update changes only the given fields`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "github", "commits", GoalPeriod.DAILY, 1)

        assertTrue(updateGoal(user, "github", "commits", GoalPeriod.DAILY, null, HabitColor.PLUM))
        var goal = goalFor(user, "github", "commits", GoalPeriod.DAILY)!!
        assertEquals(1L, goal.target)
        assertEquals(HabitColor.PLUM, goal.color)

        assertTrue(updateGoal(user, "github", "commits", GoalPeriod.DAILY, 3, null))
        goal = goalFor(user, "github", "commits", GoalPeriod.DAILY)!!
        assertEquals(3L, goal.target)
        assertEquals(HabitColor.PLUM, goal.color)
    }

    @Test
    fun `replacing a goal keeps its color`() = runBlocking {
        val user = newUser()
        upsertGoal(user, "github", "commits", GoalPeriod.WEEKLY, 5)
        updateGoal(user, "github", "commits", GoalPeriod.WEEKLY, null, HabitColor.TEAL)

        val replaced = upsertGoal(user, "github", "commits", GoalPeriod.WEEKLY, 9)
        assertEquals(9L, replaced.target)
        assertEquals(HabitColor.TEAL, replaced.color)
    }

    @Test
    fun `update and delete only touch the owner's goal`() = runBlocking {
        val owner = newUser()
        val other = newUser()
        upsertGoal(owner, "github", "commits", GoalPeriod.DAILY, 1)

        assertFalse(updateGoal(other, "github", "commits", GoalPeriod.DAILY, 2, null))
        assertFalse(deleteGoal(other, "github", "commits", GoalPeriod.DAILY))
        assertFalse(updateGoal(owner, "github", "commits", GoalPeriod.WEEKLY, 2, null))

        assertTrue(deleteGoal(owner, "github", "commits", GoalPeriod.DAILY))
        assertNull(goalFor(owner, "github", "commits", GoalPeriod.DAILY))
    }
}
