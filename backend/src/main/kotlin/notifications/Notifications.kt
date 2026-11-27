package notifications

import api.suspendTransaction
import io.ktor.util.logging.KtorSimpleLogger
import java.util.UUID
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.upsert
import user.Users

private val log = KtorSimpleLogger("Notifications")

/** The notifications a user can switch off. All are on until they do. */
@Serializable
enum class NotificationKind {
    /** 5pm: how today's goals and habits stand. */
    GOALS_STATUS,

    /** 9pm: a goal or habit streak that ends at midnight unless today is finished. */
    STREAK_RISK,

    /** Monday morning: where the user finished last week in each competition. */
    COMPETITION_RECAP,

    /** As it happens, not scheduled: someone liked one of the user's feed cards. */
    FEED_LIKES,

    /** 1pm, Tuesday to Sunday: where the user stands this week in each competition. */
    COMPETITION_STANDINGS,

    /** As it happens: progress on workout goals once Apple Health hands over today's workout. */
    WORKOUT_PROGRESS,

    /** As it happens: a step goal is nearly met. Once per goal per day (a weekly goal: per week). */
    STEPS_CLOSE,
}

/** Which push service a device's token belongs to. */
@Serializable
enum class PushPlatform {
    /** Apple Push Notification service; the token is hex. */
    @SerialName("ios") IOS,

    /** Firebase Cloud Messaging; the token is case-sensitive and not hex. */
    @SerialName("android") ANDROID,
}

/**
 * Table of push device tokens. A token identifies one install of the app, so it's the key: signing
 * in as someone else on the same phone moves the token to them.
 */
object PushDevices : Table("push_devices") {
    /** Hex APNs device token, or an FCM registration token as issued (case matters). */
    val token = varchar("token", 512)

    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE).index()

    /** Whether [token] belongs to APNs' sandbox (development builds) rather than production. iOS only. */
    val sandbox = bool("sandbox").default(false)

    /** The service [token] belongs to. Rows from before Android are iOS. */
    val platform = enumerationByName("platform", 16, PushPlatform::class).default(PushPlatform.IOS)

    val updatedAt = long("updated_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(token)
}

/** One row per (user, [NotificationKind]) the user has switched off. */
object NotificationOptOuts : Table("notification_opt_outs") {
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val kind = enumerationByName("kind", 32, NotificationKind::class)

    override val primaryKey = PrimaryKey(userID, kind)
}

/**
 * The window (a day or week start) each as-it-happens notification last went out for, so data that
 * arrives many times a day sets it off once. [topic] names the notification and what it's about.
 */
object NotificationSends : Table("notification_sends") {
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val topic = varchar("topic", 64)
    val periodStart = long("period_start")

    override val primaryKey = PrimaryKey(userID, topic)
}

/** One install that can receive pushes. */
data class PushDevice(
    val token: String,
    val sandbox: Boolean,
    val platform: PushPlatform = PushPlatform.IOS,
)

/** Point [token] at [userID], replacing whoever had it. */
suspend fun registerDevice(
    userID: UUID,
    token: String,
    sandbox: Boolean,
    platform: PushPlatform = PushPlatform.IOS,
) = suspendTransaction {
    PushDevices.upsert {
        it[PushDevices.token] = token
        it[PushDevices.userID] = userID
        it[PushDevices.sandbox] = sandbox
        it[PushDevices.platform] = platform
        it[PushDevices.updatedAt] = System.currentTimeMillis()
    }
}

private fun ResultRow.toPushDevice() =
    PushDevice(this[PushDevices.token], this[PushDevices.sandbox], this[PushDevices.platform])

/** Every device of every user that has one, keyed by user. Backs the notification worker. */
suspend fun allDevices(): Map<UUID, List<PushDevice>> = suspendTransaction {
    PushDevices.selectAll().groupBy({ it[PushDevices.userID] }, { it.toPushDevice() })
}

/** Every device of [userID]. */
suspend fun devicesFor(userID: UUID): List<PushDevice> = suspendTransaction {
    PushDevices.selectAll().where { PushDevices.userID eq userID }.map { it.toPushDevice() }
}

/**
 * Sends a push to each device through its platform's service: APNs for iOS, FCM for Android. A
 * service that isn't configured is skipped, so either can be set up without the other.
 */
object PushSender {
    val enabled: Boolean
        get() = Apns.enabled || Fcm.enabled

    suspend fun send(devices: List<PushDevice>, push: Push) {
        val (android, ios) = devices.partition { it.platform == PushPlatform.ANDROID }
        if (ios.isNotEmpty()) Apns.send(ios, push)
        if (android.isNotEmpty()) Fcm.send(android, push)
    }
}

/** Record which APNs environment [token] turned out to belong to. */
suspend fun setDeviceSandbox(token: String, sandbox: Boolean) = suspendTransaction {
    PushDevices.update({ PushDevices.token eq token }) { it[PushDevices.sandbox] = sandbox }
}

/** Stop pushing to [token]: the app signed out, or APNs no longer accepts it. */
suspend fun deleteDevice(token: String) = suspendTransaction {
    PushDevices.deleteWhere { it.run { PushDevices.token eq token } }
}

/** The kinds [userID] has switched off. */
suspend fun optOutsFor(userID: UUID): Set<NotificationKind> = suspendTransaction {
    NotificationOptOuts.selectAll()
        .where { NotificationOptOuts.userID eq userID }
        .map { it[NotificationOptOuts.kind] }
        .toSet()
}

/** Switch each kind in [enabled] on or off for [userID]; kinds not in it are left as they are. */
suspend fun setEnabled(userID: UUID, enabled: Map<NotificationKind, Boolean>) =
    suspendTransaction {
        for ((kind, on) in enabled) {
            NotificationOptOuts.deleteWhere {
                it.run {
                    (NotificationOptOuts.userID eq userID) and (NotificationOptOuts.kind eq kind)
                }
            }
            if (!on) {
                NotificationOptOuts.insert {
                    it[NotificationOptOuts.userID] = userID
                    it[NotificationOptOuts.kind] = kind
                }
            }
        }
    }

/**
 * Record that [topic] is going out to [userID] for the window starting at [periodStart]. False if
 * it already has, in which case it shouldn't be sent again.
 */
suspend fun claimSend(userID: UUID, topic: String, periodStart: Long): Boolean = suspendTransaction {
    val sentFor =
        NotificationSends.selectAll()
            .where { (NotificationSends.userID eq userID) and (NotificationSends.topic eq topic) }
            .firstOrNull()
            ?.get(NotificationSends.periodStart)
    if (sentFor == periodStart) return@suspendTransaction false
    NotificationSends.upsert {
        it[NotificationSends.userID] = userID
        it[NotificationSends.topic] = topic
        it[NotificationSends.periodStart] = periodStart
    }
    true
}

/**
 * Send an as-it-happens notification of [kind] to [userID], unless they've switched it off or have
 * no device. [push] says what, or null for nothing; it only runs when there's somewhere to send it.
 * Failures are logged, never thrown, so whatever set it off still succeeds.
 */
suspend fun sendNow(userID: UUID, kind: NotificationKind, push: suspend () -> Push?) {
    if (!PushSender.enabled) return
    runCatching {
            if (kind in optOutsFor(userID)) return
            val devices = devicesFor(userID)
            if (devices.isEmpty()) return
            PushSender.send(devices, push() ?: return)
        }
        .onFailure { log.warn("$kind notification failed: user=$userID", it) }
}
