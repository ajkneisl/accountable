package com.accountable.user

import auth.RegisterRequest
import auth.TokenResponse
import configureModule
import user.RefreshTokens
import user.Users
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
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
import user.SelfResponse
import user.UserResponse
import java.util.UUID
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class UserRoutesTest {

    @BeforeTest
    fun setupDb() {
        Database.connect(
            url = "jdbc:h2:mem:user-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
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

    private fun userTest(block: suspend ApplicationTestBuilder.(HttpClient) -> Unit) =
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
        username: String,
        email: String = "$username@example.com",
        password: String = "hunter2pass",
    ): TokenResponse =
        post("/api/auth/register") {
            contentType(ContentType.Application.Json)
            setBody(RegisterRequest(username, email, password))
        }.body()

    @Test
    fun `GET user returns the authenticated self with email`() = userTest { client ->
        val before = System.currentTimeMillis()
        val tokens = client.register("gina", email = "gina@example.com")
        val res = client.get("/api/user") { bearerAuth(tokens.accessToken) }
        assertEquals(HttpStatusCode.OK, res.status)
        val body: SelfResponse = res.body()
        assertEquals("gina", body.username)
        assertEquals("gina@example.com", body.email)
        assertNotNull(UUID.fromString(body.userID))
        assertTrue(body.createdAt >= before)
        assertTrue(body.createdAt <= System.currentTimeMillis())
    }

    @Test
    fun `GET user rejects requests without a token`() = userTest { client ->
        val res = client.get("/api/user")
        assertEquals(HttpStatusCode.Unauthorized, res.status)
    }

    @Test
    fun `GET user rejects requests with a bogus token`() = userTest { client ->
        val res = client.get("/api/user") { bearerAuth("not.a.jwt") }
        assertEquals(HttpStatusCode.Unauthorized, res.status)
    }

    @Test
    fun `GET user by name returns public profile without email`() = userTest { client ->
        client.register("target", email = "target@example.com")
        val viewer = client.register("viewer")
        val res = client.get("/api/user/target") { bearerAuth(viewer.accessToken) }
        assertEquals(HttpStatusCode.OK, res.status)
        val body: UserResponse = res.body()
        assertEquals("target", body.username)
        assertNotNull(UUID.fromString(body.userID))
        assertTrue(body.createdAt > 0)
        assertTrue(!res.bodyAsText().contains("email"))
        assertTrue(!res.bodyAsText().contains("target@example.com"))
    }

    @Test
    fun `GET user by name returns 401 for unknown name`() = userTest { client ->
        val tokens = client.register("viewer")
        val res = client.get("/api/user/nobody") { bearerAuth(tokens.accessToken) }
        assertEquals(HttpStatusCode.Unauthorized, res.status)
        assertTrue(res.bodyAsText().contains("user not found"))
    }

    @Test
    fun `GET user by name requires authentication`() = userTest { client ->
        client.register("target")
        val res = client.get("/api/user/target")
        assertEquals(HttpStatusCode.Unauthorized, res.status)
    }
}
