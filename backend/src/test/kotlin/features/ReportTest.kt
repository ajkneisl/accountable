package com.accountable.features

import auth.RegisterRequest
import auth.TokenResponse
import configureModule
import features.competition.CompetitionGoals
import features.competition.CompetitionMembers
import features.competition.CompetitionSummary
import features.competition.Competitions
import features.competition.CreateCompetitionRequest
import features.competition.joinCompetition
import features.moderation.ReportReason
import features.moderation.ReportUserRequest
import features.moderation.UserReports
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import java.io.File
import java.nio.file.Files
import java.util.UUID
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import user.ImageKind
import user.ImageStorage
import user.Images
import user.LocalImageStorage
import user.RefreshTokens
import user.SelfResponse
import user.Users
import user.setAvatarVersion

class ReportTest {
    private lateinit var dir: File
    private lateinit var original: ImageStorage

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:report-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver",
            user = "sa",
            password = "",
        )
        transaction {
            SchemaUtils.create(
                Users,
                RefreshTokens,
                Competitions,
                CompetitionMembers,
                CompetitionGoals,
                UserReports,
            )
            UserReports.deleteAll()
            CompetitionGoals.deleteAll()
            CompetitionMembers.deleteAll()
            Competitions.deleteAll()
            RefreshTokens.deleteAll()
            Users.deleteAll()
        }
        dir = Files.createTempDirectory("reports").toFile()
        original = Images.storage
        Images.storage = LocalImageStorage(dir)
    }

    @AfterTest
    fun teardown() {
        Images.storage = original
        dir.deleteRecursively()
    }

    private fun reportTest(block: suspend ApplicationTestBuilder.(HttpClient) -> Unit) =
        testApplication {
            application { configureModule() }
            val client =
                createClient { install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) } }
            block(client)
        }

    private suspend fun HttpClient.register(username: String): Pair<TokenResponse, UUID> {
        val tokens: TokenResponse =
            post("/api/auth/register") {
                contentType(ContentType.Application.Json)
                setBody(RegisterRequest(username, "$username@example.com", "hunter2pass"))
            }.body()
        val self: SelfResponse = get("/api/user") { bearerAuth(tokens.accessToken) }.body()
        return tokens to UUID.fromString(self.userID)
    }

    /** [owner] starts a competition and [others] join it. */
    private suspend fun HttpClient.competition(owner: TokenResponse, vararg others: UUID) {
        val competition: CompetitionSummary =
            post("/api/competitions") {
                bearerAuth(owner.accessToken)
                contentType(ContentType.Application.Json)
                setBody(CreateCompetitionRequest("Steps"))
            }.body()
        others.forEach { joinCompetition(it, UUID.fromString(competition.id)) }
    }

    private suspend fun HttpClient.report(
        token: String,
        userID: UUID,
        reason: ReportReason,
        details: String? = null,
    ): HttpResponse =
        post("/api/users/$userID/report") {
            bearerAuth(token)
            contentType(ContentType.Application.Json)
            setBody(ReportUserRequest(reason, details))
        }

    private fun reportCount(): Long = transaction { UserReports.selectAll().count() }

    @Test
    fun `a member reports another's name, once`() = reportTest { client ->
        val (owner, _) = client.register("olive")
        val (_, milo) = client.register("milo")
        client.competition(owner, milo)

        val first = client.report(owner.accessToken, milo, ReportReason.USERNAME, " rude ")
        assertEquals(HttpStatusCode.NoContent, first.status)
        // The same name again is accepted but not filed twice.
        assertEquals(
            HttpStatusCode.NoContent,
            client.report(owner.accessToken, milo, ReportReason.USERNAME).status,
        )
        assertEquals(1, reportCount())

        val row = transaction { UserReports.selectAll().single() }
        assertEquals("milo", row[UserReports.username])
        assertEquals("rude", row[UserReports.details])
    }

    @Test
    fun `a reported picture is kept as it was`() = reportTest { client ->
        val (owner, _) = client.register("olive")
        val (_, milo) = client.register("milo")
        client.competition(owner, milo)

        // No picture, nothing to report.
        assertEquals(
            HttpStatusCode.BadRequest,
            client.report(owner.accessToken, milo, ReportReason.AVATAR).status,
        )

        val picture = byteArrayOf(1, 2, 3)
        Images.storage.put(ImageKind.AVATAR, milo, picture)
        setAvatarVersion(milo, 42L)
        assertEquals(
            HttpStatusCode.NoContent,
            client.report(owner.accessToken, milo, ReportReason.AVATAR).status,
        )

        val row = transaction { UserReports.selectAll().single() }
        assertEquals(42L, row[UserReports.avatarVersion])
        val kept = assertNotNull(Images.storage.get(ImageKind.REPORT, row[UserReports.id]))
        assertContentEquals(picture, kept)

        // A new picture can be reported afresh.
        setAvatarVersion(milo, 43L)
        client.report(owner.accessToken, milo, ReportReason.AVATAR)
        assertEquals(2, reportCount())
    }

    @Test
    fun `only someone who shares a competition can report`() = reportTest { client ->
        val (olive, oliveID) = client.register("olive")
        val (stranger, _) = client.register("stan")

        // A stranger can't tell olive exists.
        assertEquals(
            HttpStatusCode.BadRequest,
            client.report(stranger.accessToken, oliveID, ReportReason.USERNAME).status,
        )
        assertEquals(
            HttpStatusCode.BadRequest,
            client.report(olive.accessToken, oliveID, ReportReason.USERNAME).status,
        )
        assertEquals(
            HttpStatusCode.BadRequest,
            client.report(olive.accessToken, UUID.randomUUID(), ReportReason.USERNAME).status,
        )
        assertEquals(
            HttpStatusCode.Unauthorized,
            client.report("not.a.jwt", oliveID, ReportReason.USERNAME).status,
        )
        assertEquals(0, reportCount())
    }
}
