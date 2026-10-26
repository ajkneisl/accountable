package user

import api.MappedTable
import api.toEntity
import api.verify.VerificationScope
import api.verify.Verifiable
import api.verify.Verifier
import features.habits.HabitColor
import java.time.ZoneId
import java.time.ZoneOffset
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update

/** Table that contains [User]. */
object Users : Table("users") {
    /** [User.id] */
    val id = uuid("id").clientDefault { UUID.randomUUID() }

    /** [User.username] */
    val username = varchar("username", 64).uniqueIndex()

    /** [User.password] */
    val password = varchar("password", 255)

    /** [User.email] */
    val email = varchar("email", 320)

    /** [User.createdAt] */
    val createdAt = long("created_at").clientDefault { System.currentTimeMillis() }

    /** [User.timezone] */
    val timezone = varchar("timezone", 64).default("UTC")

    /** [User.color] */
    val color = enumerationByName("color", 16, HabitColor::class).nullable()

    override val primaryKey = PrimaryKey(id)
}

/**
 * A user.
 *
 * @param id The unique ID of the user.
 * @param username The unique username of the user.
 * @param password The user's password
 * @param email The user's unique email.
 * @param createdAt The ms epoch when the account was created.
 * @param timezone The user's IANA timezone id, used to bucket their data by local day.
 * @param color The color they picked to stand for them in competitions, or null for [defaultColor].
 */
@MappedTable(Users::class)
@Verifiable(UserVerifier::class)
data class User(
    val id: UUID,
    val username: String,
    val password: String,
    val email: String,
    val createdAt: Long,
    val timezone: String = "UTC",
    val color: HabitColor? = null,
)

/** Colors a user is given before picking one. Ink is left out: it reads as no color at all. */
private val DEFAULT_COLORS = HabitColor.entries.filter { it != HabitColor.INK }

/** The color [id] gets until they pick one: fixed per user, so it's the same in every competition. */
fun defaultColor(id: UUID): HabitColor = DEFAULT_COLORS[Math.floorMod(id.hashCode(), DEFAULT_COLORS.size)]

/** The color that stands for this user in competitions. */
val User.displayColor: HabitColor
    get() = color ?: defaultColor(id)

private val USERNAME_PATTERN = Regex("^[A-Za-z0-9_-]+$")

/** Verifies fields of [User] used during registration. */
class UserVerifier : Verifier<User>() {
    override suspend fun VerificationScope<User>.rules() {
        User::username {
            notBlank("username must not be blank")
            lengthIn(3..32, "username must be 3 to 32 characters")
            matches(
                USERNAME_PATTERN,
                "username may only contain letters, numbers, underscores, and hyphens",
            )
            errorIf("username is already taken") { findUserByUsername(it) != null }
        }
        User::email {
            notBlank("email must not be blank")
            errorIf("email is already taken") { findUserByEmail(it) != null }
        }
    }
}

/** Find a user by their [id]. */
fun findUserByID(id: UUID): User? = transaction {
    Users.selectAll().where { Users.id eq id }.limit(1).firstOrNull()?.toEntity<User>()
}

/** Per-process cache of resolved timezones, evicted by [updateTimezone] when a user's zone changes. */
private val zoneCache = ConcurrentHashMap<UUID, ZoneId>()

/**
 * Set [id]'s IANA [timezone] and evict its [zoneCache] entry so subsequent day-bucketing uses the
 * new zone. Returns false if [timezone] is not a valid zone id or the user does not exist.
 */
fun updateTimezone(id: UUID, timezone: String): Boolean {
    if (runCatching { ZoneId.of(timezone) }.isFailure) return false
    val updated = transaction { Users.update({ Users.id eq id }) { it[Users.timezone] = timezone } }
    if (updated > 0) zoneCache.remove(id)
    return updated > 0
}

/**
 * The [id]'s configured [ZoneId], falling back to UTC when unset or unparseable. Result is cached:
 * [zoneOf] is called repeatedly per request (once per metric window) and the underlying value is
 * immutable after registration.
 */
fun zoneOf(id: UUID): ZoneId =
    zoneCache.getOrPut(id) {
        findUserByID(id)?.timezone?.let { runCatching { ZoneId.of(it) }.getOrNull() } ?: ZoneOffset.UTC
    }

/** Set [id]'s [color]. Returns false if the user does not exist. */
fun updateColor(id: UUID, color: HabitColor): Boolean = transaction {
    Users.update({ Users.id eq id }) { it[Users.color] = color } > 0
}

/** Set [id]'s [email]. Returns false if the user does not exist. */
fun updateEmail(id: UUID, email: String): Boolean = transaction {
    Users.update({ Users.id eq id }) { it[Users.email] = email } > 0
}

/** Set [id]'s bcrypt [passwordHash]. Returns false if the user does not exist. */
fun updatePassword(id: UUID, passwordHash: String): Boolean = transaction {
    Users.update({ Users.id eq id }) { it[Users.password] = passwordHash } > 0
}

/**
 * Delete [id] and everything it owns. Refresh tokens are removed explicitly since their foreign key
 * has no cascade; every other user-owned table cascades from [Users].
 */
fun deleteUser(id: UUID): Boolean = transaction {
    deleteAllTokensForUser(id)
    val deleted = Users.deleteWhere { sql -> sql.run { Users.id eq id } } > 0
    if (deleted) zoneCache.remove(id)
    deleted
}

/** Find a user by [username]. */
fun findUserByUsername(username: String): User? = transaction {
    Users.selectAll().where { Users.username eq username }.limit(1).firstOrNull()?.toEntity<User>()
}

/** Find a user by [email]. */
fun findUserByEmail(email: String): User? = transaction {
    Users.selectAll().where { Users.email eq email }.limit(1).firstOrNull()?.toEntity<User>()
}

/**
 * Create a [User]
 *
 * @param username The user's unique username.
 * @param email The user's email.
 * @param passwordHash The user's hashed password.
 * @param timezone The user's IANA timezone id (defaults to UTC).
 */
fun createUser(
    username: String,
    email: String,
    passwordHash: String,
    timezone: String = "UTC",
): User = transaction {
    val id = UUID.randomUUID()
    val createdAt = System.currentTimeMillis()
    Users.insert {
        it[Users.id] = id
        it[Users.username] = username
        it[Users.email] = email
        it[Users.password] = passwordHash
        it[Users.createdAt] = createdAt
        it[Users.timezone] = timezone
    }
    User(id, username, passwordHash, email, createdAt, timezone)
}
