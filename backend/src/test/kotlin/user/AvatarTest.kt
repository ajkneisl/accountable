package com.accountable.user

import auth.RegisterRequest
import auth.TokenResponse
import configureModule
import features.competition.CompetitionMembers
import features.competition.Competitions
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.delete
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.readRawBytes
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import java.awt.Color
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.file.Files
import java.util.UUID
import javax.imageio.ImageIO
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.AVATAR_SIZE
import user.AvatarResponse
import user.AvatarStorage
import user.Avatars
import user.LocalAvatarStorage
import user.RefreshTokens
import user.SelfResponse
import user.Users
import user.avatarJpeg

class AvatarTest {
    private lateinit var dir: File
    private lateinit var original: AvatarStorage

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:avatar-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(Users, RefreshTokens, Competitions, CompetitionMembers)
            CompetitionMembers.deleteAll()
            Competitions.deleteAll()
            RefreshTokens.deleteAll()
            Users.deleteAll()
        }
        dir = Files.createTempDirectory("avatars").toFile()
        original = Avatars.storage
        Avatars.storage = LocalAvatarStorage(dir)
    }

    @AfterTest
    fun teardown() {
        Avatars.storage = original
        dir.deleteRecursively()
    }

    /** A [width]×[height] image in [format], left half red and right half blue. */
    private fun image(width: Int, height: Int, format: String = "png"): ByteArray {
        val img = BufferedImage(width, height, BufferedImage.TYPE_INT_RGB)
        val g = img.createGraphics()
        g.color = Color.RED
        g.fillRect(0, 0, width / 2, height)
        g.color = Color.BLUE
        g.fillRect(width / 2, 0, width - width / 2, height)
        g.dispose()
        return ByteArrayOutputStream().also { ImageIO.write(img, format, it) }.toByteArray()
    }

    private fun read(bytes: ByteArray): BufferedImage = ImageIO.read(ByteArrayInputStream(bytes))

    @Test
    fun `a picture is cropped to its middle square and shrunk`() {
        val out = read(avatarJpeg(image(2000, 1000)))

        assertEquals(AVATAR_SIZE, out.width)
        assertEquals(AVATAR_SIZE, out.height)
        // The middle square of a half red, half blue image is still split down the middle.
        assertTrue(Color(out.getRGB(10, AVATAR_SIZE / 2)).red > 200)
        assertTrue(Color(out.getRGB(AVATAR_SIZE - 10, AVATAR_SIZE / 2)).blue > 200)
    }

    @Test
    fun `a small picture is scaled up to the stored size`() {
        val out = read(avatarJpeg(image(100, 100, "jpeg")))
        assertEquals(AVATAR_SIZE, out.width)
    }

    @Test
    fun `something that isn't an image is turned away`() {
        val error = assertFailsWith<api.Error> { avatarJpeg("not a picture".toByteArray()) }
        assertEquals(400, error.statusCode)
    }

    private fun avatarTest(block: suspend ApplicationTestBuilder.(HttpClient) -> Unit) =
        testApplication {
            application { configureModule() }
            val client =
                createClient { install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) } }
            block(client)
        }

    private suspend fun HttpClient.register(username: String): TokenResponse =
        post("/api/auth/register") {
            contentType(ContentType.Application.Json)
            setBody(RegisterRequest(username, "$username@example.com", "hunter2pass"))
        }.body()

    private suspend fun HttpClient.upload(token: String, bytes: ByteArray): HttpResponse =
        submitFormWithBinaryData(
            url = "/api/user/avatar",
            formData =
                formData {
                    append(
                        "picture",
                        bytes,
                        Headers.build {
                            append(HttpHeaders.ContentType, "image/png")
                            append(HttpHeaders.ContentDisposition, "filename=\"me.png\"")
                        },
                    )
                },
        ) {
            method = HttpMethod.Put
            bearerAuth(token)
        }

    @Test
    fun `upload, serve and remove a picture`() = avatarTest { client ->
        val tokens = client.register("pat")
        val self: SelfResponse = client.get("/api/user") { bearerAuth(tokens.accessToken) }.body()
        assertNull(self.avatarVersion)

        val uploaded = client.upload(tokens.accessToken, image(800, 600))
        assertEquals(HttpStatusCode.OK, uploaded.status)
        val version = uploaded.body<AvatarResponse>().avatarVersion

        val after: SelfResponse = client.get("/api/user") { bearerAuth(tokens.accessToken) }.body()
        assertEquals(version, after.avatarVersion)

        // Served without a token, and cached for good at a versioned URL.
        val served = client.get("/api/avatars/${self.userID}?v=$version")
        assertEquals(HttpStatusCode.OK, served.status)
        assertEquals(ContentType.Image.JPEG, served.contentType()?.withoutParameters())
        assertTrue(served.headers[HttpHeaders.CacheControl]!!.contains("immutable"))
        assertEquals(AVATAR_SIZE, read(served.readRawBytes()).width)

        val removed = client.delete("/api/user/avatar") { bearerAuth(tokens.accessToken) }
        assertEquals(HttpStatusCode.NoContent, removed.status)
        assertEquals(HttpStatusCode.NotFound, client.get("/api/avatars/${self.userID}").status)
        val cleared: SelfResponse = client.get("/api/user") { bearerAuth(tokens.accessToken) }.body()
        assertNull(cleared.avatarVersion)
    }

    @Test
    fun `uploading needs a token and an image`() = avatarTest { client ->
        assertEquals(HttpStatusCode.Unauthorized, client.upload("not.a.jwt", image(10, 10)).status)

        val tokens = client.register("sam")
        val bad = client.upload(tokens.accessToken, "plain text".toByteArray())
        assertEquals(HttpStatusCode.BadRequest, bad.status)
    }

    @Test
    fun `a picture that doesn't exist is a 404`() = avatarTest { client ->
        assertEquals(HttpStatusCode.NotFound, client.get("/api/avatars/${UUID.randomUUID()}").status)
        assertEquals(HttpStatusCode.NotFound, client.get("/api/avatars/not-a-uuid").status)
    }

    @Test
    fun `the local store saves, reads and deletes`() {
        val store = LocalAvatarStorage(dir)
        val id = UUID.randomUUID()
        assertNull(store.get(id))
        store.put(id, byteArrayOf(1, 2, 3))
        assertNotNull(store.get(id))
        store.delete(id)
        assertNull(store.get(id))
    }
}
