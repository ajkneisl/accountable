package notifications

import api.suspendTransaction
import java.util.UUID
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.upsert
import user.Users

/** The scheduled notifications a user can switch off. All are on until they do. */
@Serializable
enum class NotificationKind {
    /** 5pm: how today's goals and habits stand. */
    GOALS_STATUS,

    /** 9pm: a goal or habit streak that ends at midnight unless today is finished. */
    STREAK_RISK,

    /** Monday morning: where the user finished last week in each competition. */
    COMPETITION_RECAP,
}

/**
 * Table of APNs device tokens. A token identifies one install of the app, so it's the key: signing
 * in as someone else on the same phone moves the token to them.
 */
object PushDevices : Table("push_devices") {
    /** Hex APNs device token. */
    val token = varchar("token", 200)

    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE).index()

    /** Whether [token] belongs to APNs' sandbox (development builds) rather than production. */
    val sandbox = bool("sandbox").default(false)

    val updatedAt = long("updated_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(token)
}

/** One row per (user, [NotificationKind]) the user has switched off. */
object NotificationOptOuts : Table("notification_opt_outs") {
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val kind = enumerationByName("kind", 32, NotificationKind::class)

    override val primaryKey = PrimaryKey(userID, kind)
}

/** One install that can receive pushes. */
data class PushDevice(val token: String, val sandbox: Boolean)

/** Point [token] at [userID], replacing whoever had it. */
suspend fun registerDevice(userID: UUID, token: String, sandbox: Boolean) = suspendTransaction {
    PushDevices.upsert {
        it[PushDevices.token] = token
        it[PushDevices.userID] = userID
        it[PushDevices.sandbox] = sandbox
        it[PushDevices.updatedAt] = System.currentTimeMillis()
    }
}

/** Every device of every user that has one, keyed by user. Backs the notification worker. */
suspend fun allDevices(): Map<UUID, List<PushDevice>> = suspendTransaction {
    PushDevices.selectAll().groupBy(
        { it[PushDevices.userID] },
        { PushDevice(it[PushDevices.token], it[PushDevices.sandbox]) },
    )
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
