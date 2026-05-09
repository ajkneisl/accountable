package auth

import api.Error
import api.MultiError
import at.favre.lib.crypto.bcrypt.BCrypt
import user.User
import user.createToken
import user.createUser
import user.deleteToken
import user.findActiveTokens
import user.findUserByID
import user.findUserByUsername
import api.verify.verify
import java.security.SecureRandom
import java.util.HexFormat
import java.util.UUID
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * A token response to signing in.
 *
 * @param accessToken The access token.
 * @param accessTokenExpiresAt When [accessToken] expires.
 * @param refreshToken The token to refresh [accessToken]
 * @param refreshTokenExpiresAt When [refreshToken] expires.
 */
@Serializable
data class TokenResponse(
    val accessToken: String,
    val accessTokenExpiresAt: Long,
    val refreshToken: String,
    val refreshTokenExpiresAt: Long,
)

/** Handle authorization! */
object Auth {
    private val random = SecureRandom()

    /**
     * Register a user.
     *
     * @param username The user provided username.
     * @param email The user provided email.
     * @param plainPassword The user provided password.
     */
    suspend fun register(username: String, email: String, plainPassword: String): TokenResponse {
        val errors = User(UUID.randomUUID(), username, "", email, 0).verify().toMutableList()
        if (plainPassword.length < 8) errors += "password must be at least 8 characters"
        if (plainPassword.length > 128) errors += "password must be at most 128 characters"
        if (plainPassword.none(Char::isLetter)) errors += "password must contain a letter"
        if (plainPassword.none(Char::isDigit)) errors += "password must contain a digit"
        if (errors.isNotEmpty()) MultiError.texts(errors)

        val hash = BCrypt.withDefaults().hashToString(12, plainPassword.toCharArray())
        val user = createUser(username, email, hash)

        return issueTokens(user)
    }

    /**
     * Login
     *
     * @param username The user provided username.
     * @param plainPassword The use rprovided password.
     */
    fun login(username: String, plainPassword: String): TokenResponse {
        val user = findUserByUsername(username) ?: Error.text("invalid credentials")
        val ok = BCrypt.verifyer().verify(plainPassword.toCharArray(), user.password).verified
        if (!ok) Error.text("invalid credentials")
        return issueTokens(user)
    }

    /** Create an access token from a [refreshToken]. */
    fun refresh(refreshToken: String): TokenResponse = transaction {
        val active = findActiveTokens(refreshToken) ?: Error.text("Invalid refresh token")
        val user = findUserByID(active.userID) ?: Error.text("Invalid refresh token")

        deleteToken(refreshToken)
        issueTokens(user)
    }

    /** Log out a [refreshToken]. */
    fun logout(refreshToken: String) {
        deleteToken(refreshToken)
    }

    /** Issue tokens for a [user]. */
    private fun issueTokens(user: User): TokenResponse {
        val access = JwtConfig.issueAccessToken(user.id, user.username)
        val refreshValue = generateOpaqueToken()
        val refresh = createToken(refreshValue, user.id)

        return TokenResponse(
            accessToken = access,
            refreshToken = refresh.token,
            accessTokenExpiresAt = System.currentTimeMillis() + JwtConfig.ACCESS_TOKEN_TTL_MS,
            refreshTokenExpiresAt = refresh.expiresAt,
        )
    }

    /** Generate a token. */
    private fun generateOpaqueToken(): String {
        val bytes = ByteArray(48)
        random.nextBytes(bytes)
        return HexFormat.of().formatHex(bytes)
    }
}
