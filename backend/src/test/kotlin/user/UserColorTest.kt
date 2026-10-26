package com.accountable.user

import features.habits.HabitColor
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.Users
import user.createUser
import user.defaultColor
import user.displayColor
import user.findUserByID
import user.updateColor

class UserColorTest {
    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:user-color-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users)
            Users.deleteAll()
        }
    }

    private fun newUser(): UUID =
        createUser("u${UUID.randomUUID().toString().take(8)}", "${UUID.randomUUID()}@e.com", "hash", "UTC").id

    @Test
    fun `a new user shows in their default color, which is never ink`() {
        val id = newUser()
        val user = findUserByID(id)!!
        assertNull(user.color)
        assertEquals(defaultColor(id), user.displayColor)
        assertEquals(defaultColor(id), defaultColor(id))
        repeat(50) { assertNotEquals(HabitColor.INK, defaultColor(UUID.randomUUID())) }
    }

    @Test
    fun `a picked color replaces the default`() {
        val id = newUser()
        assertTrue(updateColor(id, HabitColor.INK))
        assertEquals(HabitColor.INK, findUserByID(id)!!.displayColor)
    }
}
