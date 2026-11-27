package features.moderation

import api.Error
import api.suspendTransaction
import email.Email
import email.Mail
import features.competition.competitionsFor
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.slf4j.LoggerFactory
import user.ImageKind
import user.Images
import user.User
import user.Users
import user.findUserByID

/** What about a person is being reported. */
enum class ReportReason {
    /** Their profile picture. */
    AVATAR,

    /** Their username. */
    USERNAME,
}

/**
 * One person's report about another. It keeps what was reported as it was then — the username, and
 * for a picture its version (with a copy of the picture under [ImageKind.REPORT]) — since either
 * may well have changed by the time it's looked at.
 */
object UserReports : Table("user_reports") {
    val id = uuid("id").clientDefault { UUID.randomUUID() }
    val reporterID = uuid("reporter_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val reportedID = uuid("reported_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val reason = enumerationByName("reason", 16, ReportReason::class)

    /** The reported person's username when the report was made. */
    val username = varchar("username", 64)

    /** The reported picture's version, for an [ReportReason.AVATAR] report. */
    val avatarVersion = long("avatar_version").nullable()

    /** Anything the reporter added. */
    val details = varchar("details", MAX_DETAILS).nullable()
    val createdAt = long("created_at")

    override val primaryKey = PrimaryKey(id)
}

/** Longest note a reporter may add. */
const val MAX_DETAILS = 500

/** Request body for [POST /users/{id}/report]. */
@Serializable data class ReportUserRequest(val reason: ReportReason, val details: String? = null)

private val log = LoggerFactory.getLogger("features.moderation.Report")

/** True iff [a] and [b] are in at least one competition together. */
private suspend fun shareACompetition(a: UUID, b: UUID): Boolean {
    val theirs = competitionsFor(b).map { it.id }.toSet()
    return competitionsFor(a).any { it.id in theirs }
}

/**
 * Report [reportedID]'s [reason] on behalf of [reporterID]. Only someone they share a competition
 * with can see them, so only they can report them; to anyone else they don't exist. Reporting the
 * same thing twice (the same picture, or the same name) is a no-op, so a report can't be used to
 * flood the moderators.
 */
suspend fun reportUser(
    reporterID: UUID,
    reportedID: UUID,
    reason: ReportReason,
    details: String?,
) {
    if (reporterID == reportedID) Error.text("you can't report yourself")
    val reported = findUserByID(reportedID) ?: Error.notFound("user")
    if (!shareACompetition(reporterID, reportedID)) Error.notFound("user")

    val note = details?.trim()?.takeIf { it.isNotEmpty() }
    if (note != null && note.length > MAX_DETAILS) {
        Error.text("details must be at most $MAX_DETAILS characters")
    }
    val avatarVersion =
        when (reason) {
            ReportReason.AVATAR -> reported.avatarVersion ?: Error.text("they have no profile picture")
            ReportReason.USERNAME -> null
        }

    val reportID =
        suspendTransaction {
            val already =
                UserReports.selectAll()
                    .where {
                        (UserReports.reporterID eq reporterID) and
                            (UserReports.reportedID eq reportedID) and
                            (UserReports.reason eq reason) and
                            when (reason) {
                                ReportReason.AVATAR -> UserReports.avatarVersion eq avatarVersion
                                ReportReason.USERNAME -> UserReports.username eq reported.username
                            }
                    }
                    .limit(1)
                    .any()
            if (already) return@suspendTransaction null

            val id = UUID.randomUUID()
            UserReports.insert {
                it[UserReports.id] = id
                it[UserReports.reporterID] = reporterID
                it[UserReports.reportedID] = reportedID
                it[UserReports.reason] = reason
                it[UserReports.username] = reported.username
                it[UserReports.avatarVersion] = avatarVersion
                it[UserReports.details] = note
                it[createdAt] = System.currentTimeMillis()
            }
            id
        } ?: return

    if (reason == ReportReason.AVATAR) keepReportedPicture(reportID, reportedID)
    notifyModerators(reportID, reporterID, reported, reason, note)
}

/**
 * A copy of [userID]'s picture as it is now, kept with [reportID]: theirs is replaced on every
 * upload. Best-effort; the report stands without it.
 */
private suspend fun keepReportedPicture(reportID: UUID, userID: UUID) {
    withContext(Dispatchers.IO) {
        runCatching {
                Images.storage.get(ImageKind.AVATAR, userID)?.let {
                    Images.storage.put(ImageKind.REPORT, reportID, it)
                }
            }
            .onFailure { log.error("Couldn't keep the picture reported in {}", reportID, it) }
    }
}

/** Email `REPORTS_EMAIL` about a new report; with none set, it's only logged. */
private fun notifyModerators(
    reportID: UUID,
    reporterID: UUID,
    reported: User,
    reason: ReportReason,
    details: String?,
) {
    val what =
        when (reason) {
            ReportReason.AVATAR -> "profile picture"
            ReportReason.USERNAME -> "username"
        }
    val webUrl = (System.getenv("WEB_URL") ?: "https://beacc.app").trimEnd('/')
    val lines = buildList {
        add("${reported.username} (${reported.id}) was reported for their $what.")
        add("")
        add("Report: $reportID")
        add("Reported by: $reporterID")
        if (reason == ReportReason.AVATAR) {
            add("Picture: $webUrl/api/avatars/${reported.id}?v=${reported.avatarVersion}")
            add("A copy is kept at ${ImageKind.REPORT.folder}/$reportID.jpg.")
        }
        if (details != null) {
            add("")
            add("Details: $details")
        }
    }
    val text = lines.joinToString("\n")

    val to = System.getenv("REPORTS_EMAIL")?.takeIf { it.isNotBlank() }
    if (to == null) {
        log.warn("REPORTS_EMAIL isn't set, so this report is only logged:\n{}", text)
        return
    }
    Mail.sendLater(Email(to, "Report: ${reported.username}'s $what", text))
}
