package com.accountable.auth

import com.auth0.jwt.JWT
import com.auth0.jwt.JWTVerifier
import com.auth0.jwt.algorithms.Algorithm
import java.util.Date
import java.util.UUID

object JwtConfig {
    const val ISSUER = "accountable"
    const val AUDIENCE = "accountable-app"
    const val REALM = "accountable"
    const val ACCESS_TOKEN_TTL_MS: Long = 24L * 60 * 60 * 1000

    private val secret: String =
        System.getenv("JWT_SECRET")
            ?: "dev-secret-change-me-in-production-please-and-thank-you"

    private val algorithm: Algorithm = Algorithm.HMAC256(secret)

    val verifier: JWTVerifier =
        JWT.require(algorithm)
            .withIssuer(ISSUER)
            .withAudience(AUDIENCE)
            .build()

    fun issueAccessToken(userId: UUID, username: String): String {
        val now = System.currentTimeMillis()
        return JWT.create()
            .withIssuer(ISSUER)
            .withAudience(AUDIENCE)
            .withSubject(userId.toString())
            .withClaim("username", username)
            .withIssuedAt(Date(now))
            .withExpiresAt(Date(now + ACCESS_TOKEN_TTL_MS))
            .sign(algorithm)
    }
}
