package auth

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

    /** How long a display's access lasts before it renews from its billboard link, which itself
     * never expires. Short so that revoking the link takes effect within the hour. */
    const val DISPLAY_TOKEN_TTL_MS: Long = 60L * 60 * 1000

    /** How long a screen time token lasts. The phone's Screen Time extension posts with it and
     * can't sign in to renew one, so it has to outlast long stretches of the app never being opened;
     * the app fetches a fresh one whenever it does run. */
    const val SCREEN_TIME_TOKEN_TTL_MS: Long = 30L * 24 * 60 * 60 * 1000

    /** Claim limiting what a token may do; absent on a normal session's token. */
    const val SCOPE_CLAIM = "scope"

    /** [SCOPE_CLAIM] of a billboard display's token: it may only read. */
    const val DISPLAY_SCOPE = "display"

    /** [SCOPE_CLAIM] of the Screen Time extension's token: it may only import screen time. */
    const val SCREEN_TIME_SCOPE = "screen_time"

    /** The one request a [SCREEN_TIME_SCOPE] token is accepted on, as a POST. */
    const val SCREEN_TIME_IMPORT_PATH = "/api/integrations/screen_time/import"

    private val secret: String =
        System.getenv("JWT_SECRET")
            ?: "dev-secret-change-me-in-production-please-and-thank-you"

    private val algorithm: Algorithm = Algorithm.HMAC256(secret)

    val verifier: JWTVerifier =
        JWT.require(algorithm)
            .withIssuer(ISSUER)
            .withAudience(AUDIENCE)
            .build()

    fun issueAccessToken(userId: UUID, username: String): String =
        issue(userId, username, ACCESS_TOKEN_TTL_MS, scope = null)

    /** An access token for a billboard display, which the server only accepts on GET requests. */
    fun issueDisplayToken(userId: UUID, username: String): String =
        issue(userId, username, DISPLAY_TOKEN_TTL_MS, DISPLAY_SCOPE)

    /** A token for the phone's Screen Time extension, which the server only accepts on a POST to
     * [SCREEN_TIME_IMPORT_PATH]. */
    fun issueScreenTimeToken(userId: UUID, username: String): String =
        issue(userId, username, SCREEN_TIME_TOKEN_TTL_MS, SCREEN_TIME_SCOPE)

    private fun issue(userId: UUID, username: String, ttlMs: Long, scope: String?): String {
        val now = System.currentTimeMillis()
        return JWT.create()
            .withIssuer(ISSUER)
            .withAudience(AUDIENCE)
            .withSubject(userId.toString())
            .withClaim("username", username)
            .apply { if (scope != null) withClaim(SCOPE_CLAIM, scope) }
            .withIssuedAt(Date(now))
            .withExpiresAt(Date(now + ttlMs))
            .sign(algorithm)
    }
}
