package auth

import api.MultiError
import user.RefreshTokens
import user.Users
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class AuthTest {

    @BeforeTest
    fun setupDb() {
        Database.connect(
            url = "jdbc:h2:mem:auth-unit-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens)
            RefreshTokens.deleteAll()
            Users.deleteAll()
        }
    }

    @Test
    fun `register accepts a valid password`() = runBlocking {
        val tokens = Auth.register("alice", "alice@example.com", "hunter22")
        assertTrue(tokens.accessToken.isNotBlank())
        assertTrue(tokens.refreshToken.isNotBlank())
    }

    @Test
    fun `register rejects password shorter than 8 characters`() = runBlocking {
        val err = assertFailsWith<MultiError> {
            Auth.register("alice", "alice@example.com", "ab1")
        }
        assertEquals(400, err.statusCode)
        assertTrue(
            err.messages.any { it.contains("at least 8 characters") },
            "expected min-length error, got: ${err.messages}",
        )
    }

    @Test
    fun `register rejects password longer than 128 characters`() = runBlocking {
        val long = "a1" + "x".repeat(200)
        val err = assertFailsWith<MultiError> {
            Auth.register("alice", "alice@example.com", long)
        }
        assertTrue(
            err.messages.any { it.contains("at most 128 characters") },
            "expected max-length error, got: ${err.messages}",
        )
    }

    @Test
    fun `register rejects password with no letters`() = runBlocking {
        val err = assertFailsWith<MultiError> {
            Auth.register("alice", "alice@example.com", "12345678")
        }
        assertTrue(
            err.messages.any { it.contains("letter") },
            "expected letter-required error, got: ${err.messages}",
        )
    }

    @Test
    fun `register rejects password with no digits`() = runBlocking {
        val err = assertFailsWith<MultiError> {
            Auth.register("alice", "alice@example.com", "abcdefghij")
        }
        assertTrue(
            err.messages.any { it.contains("digit") },
            "expected digit-required error, got: ${err.messages}",
        )
    }

    @Test
    fun `register accumulates password and user errors together`() = runBlocking {
        val err = assertFailsWith<MultiError> {
            Auth.register("a", "alice@example.com", "short")
        }
        assertTrue(err.messages.any { it.contains("3 to 32 characters") })
        assertTrue(err.messages.any { it.contains("at least 8 characters") })
    }
}
