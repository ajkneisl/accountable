package com.accountable.auth

import auth.LoginRequest
import auth.RefreshRequest
import auth.RegisterRequest
import auth.TokenResponse
import configureModule
import user.RefreshTokens
import user.Users
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class AuthRoutesTest {

    @BeforeTest
    fun setupDb() {
        Database.connect(
            url = "jdbc:h2:mem:auth-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
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

    private fun authTest(block: suspend ApplicationTestBuilder.(HttpClient) -> Unit) =
        testApplication {
            application { configureModule() }
            val client =
                createClient {
                    install(ContentNegotiation) {
                        json(Json { ignoreUnknownKeys = true })
                    }
                }
            block(client)
        }

    private suspend fun HttpClient.register(
        username: String = "alice",
        email: String = "alice@example.com",
        password: String = "hunter2",
    ): TokenResponse =
        post("/api/auth/register") {
            contentType(ContentType.Application.Json)
            setBody(RegisterRequest(username, email, password))
        }.body()

    @Test
    fun `register returns tokens and 200`() = authTest { client ->
        val res: HttpResponse =
            client.post("/api/auth/register") {
                contentType(ContentType.Application.Json)
                setBody(RegisterRequest("alice", "alice@example.com", "hunter2"))
            }
        assertEquals(HttpStatusCode.OK, res.status)
        val body: TokenResponse = res.body()
        assertTrue(body.accessToken.isNotBlank())
        assertTrue(body.refreshToken.isNotBlank())
        assertTrue(body.accessTokenExpiresAt > System.currentTimeMillis())
        assertTrue(body.refreshTokenExpiresAt > body.accessTokenExpiresAt)
    }

    @Test
    fun `register rejects duplicate username`() = authTest { client ->
        client.register(username = "bob")
        val res =
            client.post("/api/auth/register") {
                contentType(ContentType.Application.Json)
                setBody(RegisterRequest("bob", "bob2@example.com", "another-password"))
            }
        assertEquals(HttpStatusCode.Unauthorized, res.status)
        assertTrue(res.bodyAsText().contains("username already taken"))
    }

    @Test
    fun `login succeeds with valid credentials`() = authTest { client ->
        client.register(username = "carol", password = "correct-horse")
        val res =
            client.post("/api/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(LoginRequest("carol", "correct-horse"))
            }
        assertEquals(HttpStatusCode.OK, res.status)
        val tokens: TokenResponse = res.body()
        assertTrue(tokens.accessToken.isNotBlank())
        assertTrue(tokens.refreshToken.isNotBlank())
    }

    @Test
    fun `login fails for unknown user`() = authTest { client ->
        val res =
            client.post("/api/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(LoginRequest("ghost", "whatever"))
            }
        assertEquals(HttpStatusCode.Unauthorized, res.status)
        assertTrue(res.bodyAsText().contains("invalid credentials"))
    }

    @Test
    fun `login fails for wrong password`() = authTest { client ->
        client.register(username = "dave", password = "right-password")
        val res =
            client.post("/api/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(LoginRequest("dave", "wrong-password"))
            }
        assertEquals(HttpStatusCode.Unauthorized, res.status)
        assertTrue(res.bodyAsText().contains("invalid credentials"))
    }

    @Test
    fun `refresh issues new tokens and rotates the refresh token`() = authTest { client ->
        val original = client.register(username = "erin")
        val res =
            client.post("/api/auth/refresh") {
                contentType(ContentType.Application.Json)
                setBody(RefreshRequest(original.refreshToken))
            }
        assertEquals(HttpStatusCode.OK, res.status)
        val refreshed: TokenResponse = res.body()
        assertNotEquals(original.refreshToken, refreshed.refreshToken)
        assertTrue(refreshed.accessToken.isNotBlank())

        val replay =
            client.post("/api/auth/refresh") {
                contentType(ContentType.Application.Json)
                setBody(RefreshRequest(original.refreshToken))
            }
        assertEquals(HttpStatusCode.Unauthorized, replay.status)
    }

    @Test
    fun `refresh fails for unknown token`() = authTest { client ->
        val res =
            client.post("/api/auth/refresh") {
                contentType(ContentType.Application.Json)
                setBody(RefreshRequest("not-a-real-token"))
            }
        assertEquals(HttpStatusCode.Unauthorized, res.status)
        assertTrue(res.bodyAsText().contains("invalid refresh token"))
    }

    @Test
    fun `logout invalidates the refresh token`() = authTest { client ->
        val tokens = client.register(username = "frank")
        val logout =
            client.post("/api/auth/logout") {
                contentType(ContentType.Application.Json)
                setBody(RefreshRequest(tokens.refreshToken))
            }
        assertEquals(HttpStatusCode.NoContent, logout.status)

        val refresh =
            client.post("/api/auth/refresh") {
                contentType(ContentType.Application.Json)
                setBody(RefreshRequest(tokens.refreshToken))
            }
        assertEquals(HttpStatusCode.Unauthorized, refresh.status)
    }

    @Test
    fun `logout is idempotent for unknown tokens`() = authTest { client ->
        val res =
            client.post("/api/auth/logout") {
                contentType(ContentType.Application.Json)
                setBody(RefreshRequest("never-existed"))
            }
        assertEquals(HttpStatusCode.NoContent, res.status)
    }

}
