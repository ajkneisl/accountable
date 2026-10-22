package auth

import api.Error
import api.MultiError
import at.favre.lib.crypto.bcrypt.BCrypt
import user.User
import user.createToken
import user.createUser
import user.deleteAllTokensForUser
import user.deleteUser
import user.deleteToken
import user.findActiveTokens
import user.findUserByEmail
import user.findUserByID
import user.findUserByUsername
import user.updateEmail
import user.updatePassword
import api.verify.verify
import java.security.SecureRandom
import java.time.ZoneId
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
     * @param timezone The user's IANA timezone id; ignored and replaced with UTC if unparseable.
     */
    suspend fun register(
        username: String,
        email: String,
        plainPassword: String,
        timezone: String = "UTC",
    ): TokenResponse {
        if (findUserByUsername(username) != null) Error.unauthorized("username already taken")

        val errors = User(UUID.randomUUID(), username, "", email, 0).verify().toMutableList()
        errors += passwordErrors(plainPassword)
        if (errors.isNotEmpty()) MultiError.texts(errors)

        val tz = timezone.takeIf { runCatching { ZoneId.of(it) }.isSuccess } ?: "UTC"
        val hash = BCrypt.withDefaults().hashToString(12, plainPassword.toCharArray())
        val user = createUser(username, email, hash, tz)

        return issueTokens(user)
    }

    /**
     * Login
     *
     * @param username The user provided username.
     * @param plainPassword The use rprovided password.
     */
    fun login(username: String, plainPassword: String): TokenResponse {
        val user = findUserByUsername(username) ?: Error.unauthorized("invalid credentials")
        val ok = BCrypt.verifyer().verify(plainPassword.toCharArray(), user.password).verified
        if (!ok) Error.unauthorized("invalid credentials")
        return issueTokens(user)
    }

    /**
     * Change [userID]'s password after checking [currentPassword]. Every existing session is
     * revoked, and a fresh token pair is returned so the caller stays signed in.
     */
    fun changePassword(userID: UUID, currentPassword: String, newPassword: String): TokenResponse {
        val user = requirePassword(userID, currentPassword)
        val errors = passwordErrors(newPassword)
        if (errors.isNotEmpty()) MultiError.texts(errors)

        updatePassword(userID, BCrypt.withDefaults().hashToString(12, newPassword.toCharArray()))
        deleteAllTokensForUser(userID)
        return issueTokens(user)
    }

    /** Change [userID]'s email after checking [currentPassword]. */
    fun changeEmail(userID: UUID, currentPassword: String, email: String) {
        val user = requirePassword(userID, currentPassword)
        val trimmed = email.trim()
        if (trimmed.isBlank()) Error.text("email must not be blank")
        if (trimmed.length > 320) Error.text("email must be at most 320 characters")
        if (trimmed == user.email) return
        if (findUserByEmail(trimmed) != null) Error.text("email is already taken")
        updateEmail(userID, trimmed)
    }

    /** Permanently delete [userID] and all of its data after checking [currentPassword]. */
    fun deleteAccount(userID: UUID, currentPassword: String) {
        requirePassword(userID, currentPassword)
        deleteUser(userID)
    }

    /**
     * Load [userID] and check [password] against it. A wrong password is a 400 rather than a 401 so
     * clients don't mistake it for an expired session.
     */
    private fun requirePassword(userID: UUID, password: String): User {
        val user = findUserByID(userID) ?: Error.notFound("user")
        val ok = BCrypt.verifyer().verify(password.toCharArray(), user.password).verified
        if (!ok) Error.text("current password is incorrect")
        return user
    }

    /** Strength rules shared by registration and password changes. */
    private fun passwordErrors(password: String): List<String> = buildList {
        if (password.length < 8) add("password must be at least 8 characters")
        if (password.length > 128) add("password must be at most 128 characters")
        if (password.none(Char::isLetter)) add("password must contain a letter")
        if (password.none(Char::isDigit)) add("password must contain a digit")
    }

    /** Create an access token from a [refreshToken]. */
    fun refresh(refreshToken: String): TokenResponse = transaction {
        val active = findActiveTokens(refreshToken) ?: Error.unauthorized("invalid refresh token")
        val user = findUserByID(active.userID) ?: Error.unauthorized("invalid refresh token")

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
