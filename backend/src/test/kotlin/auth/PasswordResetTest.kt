package com.accountable.auth

import at.favre.lib.crypto.bcrypt.BCrypt
import auth.Auth
import auth.PasswordReset
import auth.PasswordResets
import email.Email
import email.Mail
import java.util.Collections
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails
import kotlin.test.assertTrue
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.RefreshTokens
import user.Users
import user.findUserByUsername

class PasswordResetTest {
    private val sent: MutableList<Email> = Collections.synchronizedList(mutableListOf())
    private val previous = Mail.mailer

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:reset-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens, PasswordResets)
            PasswordResets.deleteAll()
            RefreshTokens.deleteAll()
            Users.deleteAll()
        }
        Mail.mailer = email.Mailer { sent += it }
    }

    @AfterTest
    fun teardown() {
        Mail.mailer = previous
    }

    /** Sends happen in the background; wait for [count] of them. */
    private fun awaitSent(count: Int): List<Email> {
        val deadline = System.currentTimeMillis() + 5_000
        while (sent.size < count && System.currentTimeMillis() < deadline) Thread.sleep(20)
        assertEquals(count, sent.size)
        return sent.toList()
    }

    private fun tokenIn(email: Email): String =
        Regex("token=([0-9a-f]{64})").find(email.text)!!.groupValues[1]

    private suspend fun alice() = Auth.register("alice", "Alice@Example.com", "oldpass123")

    @Test
    fun `a reset link sets a new password and signs every session out`(): Unit = kotlinx.coroutines.runBlocking {
        alice()
        PasswordReset.request("alice")
        val email = awaitSent(1).single()
        assertEquals("Alice@Example.com", email.to)
        assertTrue(email.text.contains("https://beacc.app/reset-password?token="))

        PasswordReset.reset(tokenIn(email), "newpass456")

        val user = findUserByUsername("alice")!!
        assertTrue(BCrypt.verifyer().verify("newpass456".toCharArray(), user.password).verified)
        assertEquals(0L, transaction { RefreshTokens.selectAll().count() })
        assertEquals(0L, transaction { PasswordResets.selectAll().count() })
    }

    @Test
    fun `an email address finds the account regardless of case`(): Unit = kotlinx.coroutines.runBlocking {
        alice()
        PasswordReset.request("  alice@example.COM ")
        assertEquals("Alice@Example.com", awaitSent(1).single().to)
    }

    @Test
    fun `an unknown account sends nothing and says nothing`() {
        PasswordReset.request("nobody@example.com")
        Thread.sleep(200)
        assertEquals(0, sent.size)
    }

    @Test
    fun `a link works only once`(): Unit = kotlinx.coroutines.runBlocking {
        alice()
        PasswordReset.request("alice")
        val token = tokenIn(awaitSent(1).single())
        PasswordReset.reset(token, "newpass456")

        assertFails { PasswordReset.reset(token, "another789") }
    }

    @Test
    fun `an expired link is refused`(): Unit = kotlinx.coroutines.runBlocking {
        alice()
        val sentAt = System.currentTimeMillis() - PasswordReset.TTL_MS - 1
        PasswordReset.request("alice", now = sentAt)
        val token = tokenIn(awaitSent(1).single())

        assertFails { PasswordReset.reset(token, "newpass456") }
    }

    @Test
    fun `a weak new password is refused and the link still works`(): Unit = kotlinx.coroutines.runBlocking {
        alice()
        PasswordReset.request("alice")
        val token = tokenIn(awaitSent(1).single())

        assertFails { PasswordReset.reset(token, "short") }
        PasswordReset.reset(token, "newpass456")
    }

    @Test
    fun `links are capped per hour`(): Unit = kotlinx.coroutines.runBlocking {
        alice()
        repeat(PasswordReset.MAX_PER_HOUR + 2) { PasswordReset.request("alice") }
        Thread.sleep(300)
        awaitSent(PasswordReset.MAX_PER_HOUR)
    }
}
