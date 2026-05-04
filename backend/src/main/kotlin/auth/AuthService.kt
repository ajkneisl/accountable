package com.accountable.auth

import at.favre.lib.crypto.bcrypt.BCrypt
import com.accountable.db.User
import com.accountable.db.createToken
import com.accountable.db.createUser
import com.accountable.db.deleteToken
import com.accountable.db.findActiveTokens
import com.accountable.db.findUserByID
import com.accountable.db.findUserByUsername
import org.jetbrains.exposed.sql.transactions.transaction
import java.security.SecureRandom
import java.util.HexFormat

data class TokenPair(
    val accessToken: String,
    val refreshToken: String,
    val accessTokenExpiresAt: Long,
    val refreshTokenExpiresAt: Long,
)

class AuthException(message: String) : RuntimeException(message)

object AuthService {
    private val random = SecureRandom()

    fun register(username: String, email: String, plainPassword: String): TokenPair {
        if (findUserByUsername(username) != null) {
            throw AuthException("username already taken")
        }
        val hash = BCrypt.withDefaults().hashToString(12, plainPassword.toCharArray())
        val user = createUser(username, email, hash)
        return issueTokens(user)
    }

    fun login(username: String, plainPassword: String): TokenPair {
        val user = findUserByUsername(username)
            ?: throw AuthException("invalid credentials")
        val ok = BCrypt.verifyer().verify(plainPassword.toCharArray(), user.password).verified
        if (!ok) throw AuthException("invalid credentials")
        return issueTokens(user)
    }

    fun refresh(refreshToken: String): TokenPair {
        val (newPair, _) = transaction {
            val active = findActiveTokens(refreshToken)
                ?: throw AuthException("invalid refresh token")
            val user = findUserByID(active.userID)
                ?: throw AuthException("invalid refresh token")
            deleteToken(refreshToken)
            issueTokens(user) to user
        }
        return newPair
    }

    fun logout(refreshToken: String) {
        deleteToken(refreshToken)
    }

    private fun issueTokens(user: User): TokenPair {
        val access = JwtConfig.issueAccessToken(user.id, user.username)
        val refreshValue = generateOpaqueToken()
        val refresh = createToken(refreshValue, user.id)
        return TokenPair(
            accessToken = access,
            refreshToken = refresh.token,
            accessTokenExpiresAt = System.currentTimeMillis() + JwtConfig.ACCESS_TOKEN_TTL_MS,
            refreshTokenExpiresAt = refresh.expiresAt,
        )
    }

    private fun generateOpaqueToken(): String {
        val bytes = ByteArray(48)
        random.nextBytes(bytes)
        return HexFormat.of().formatHex(bytes)
    }
}
