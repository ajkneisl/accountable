package com.accountable.db

import java.util.UUID
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction

/** A refresh token. */
object RefreshTokens : Table("refresh_tokens") {
    const val REFRESH_TOKEN_TTL_MS: Long = 30L * 24 * 60 * 60 * 1000

    /** [RefreshTokens.token] */
    val token = varchar("token", 128)

    /** [RefreshTokens.userID] */
    val userID = uuid("user_id").references(Users.id)

    /** [RefreshTokens.expiresAt] */
    val expiresAt =
        long("expires_at").clientDefault { System.currentTimeMillis() + REFRESH_TOKEN_TTL_MS }

    /** [RefreshTokens.createdAt] */
    val createdAt = long("created_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(token)
}

/**
 * A refresh token. A refresh token is used to create JWTs.
 *
 * @param token The refresh token itself.
 * @param userID The user who holds the token.
 * @param expiresAt When the token expires.
 * @param createdAt When the token was created.
 */
@MappedTable(RefreshTokens::class)
data class RefreshToken(
    val token: String,
    val userID: UUID,
    val expiresAt: Long,
    val createdAt: Long,
)

/**
 * Find all active tokens in [RefreshTokens].
 *
 * @param token The token to search for.
 * @param now The time to search for the expiration of the token.
 */
fun findActiveTokens(token: String, now: Long = System.currentTimeMillis()): RefreshToken? =
    transaction {
        RefreshTokens.selectAll()
            .where { (RefreshTokens.token eq token) and (RefreshTokens.expiresAt greater now) }
            .limit(1)
            .firstOrNull()
            ?.toEntity<RefreshToken>()
    }

/**
 * Create a token for a [userID].
 *
 * @param token The token string itself.
 * @param userID The author for the token.
 * @param ttlMs How many seconds after now when this w
 */
fun createToken(
    token: String,
    userID: UUID,
    ttlMs: Long = RefreshTokens.REFRESH_TOKEN_TTL_MS,
): RefreshToken = transaction {
    val now = System.currentTimeMillis()
    val expiresAt = now + ttlMs

    RefreshTokens.insert {
        it[RefreshTokens.token] = token
        it[RefreshTokens.userID] = userID
        it[RefreshTokens.expiresAt] = expiresAt
        it[RefreshTokens.createdAt] = now
    }

    RefreshToken(token, userID, expiresAt, now)
}

/** Delete a token by it's [token] string. */
fun deleteToken(token: String): Int = transaction {
    RefreshTokens.deleteWhere { sql -> sql.run { RefreshTokens.token eq token } }
}

/** Delete all tokens for a [userID]. */
fun deleteAllTokensForUser(userID: UUID): Int = transaction {
    RefreshTokens.deleteWhere { sql -> sql.run { RefreshTokens.userID eq userID } }
}
