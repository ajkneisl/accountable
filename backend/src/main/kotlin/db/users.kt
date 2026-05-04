package com.accountable.db

import java.util.UUID
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction

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
 */
@MappedTable(Users::class)
data class User(
    val id: UUID,
    val username: String,
    val password: String,
    val email: String,
    val createdAt: Long,
)

/** Find a user by their [id]. */
fun findUserByID(id: UUID): User? = transaction {
    Users.selectAll().where { Users.id eq id }.limit(1).firstOrNull()?.toEntity<User>()
}

/** Find a user by [username]. */
fun findUserByUsername(username: String): User? = transaction {
    Users.selectAll().where { Users.username eq username }.limit(1).firstOrNull()?.toEntity<User>()
}

/**
 * Create a [User]
 *
 * @param username The user's unique username.
 * @param email The user's email.
 * @param passwordHash The user's hashed password.
 */
fun createUser(username: String, email: String, passwordHash: String): User = transaction {
    val id = UUID.randomUUID()
    val createdAt = System.currentTimeMillis()
    Users.insert {
        it[Users.id] = id
        it[Users.username] = username
        it[Users.email] = email
        it[Users.password] = passwordHash
        it[Users.createdAt] = createdAt
    }
    User(id, username, passwordHash, email, createdAt)
}
