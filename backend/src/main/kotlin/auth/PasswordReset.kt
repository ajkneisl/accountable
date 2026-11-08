package auth

import api.Error
import api.MultiError
import at.favre.lib.crypto.bcrypt.BCrypt
import email.Email
import email.Mail
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.HexFormat
import java.util.UUID
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.lowerCase
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import user.User
import user.Users
import user.deleteAllTokensForUser
import user.findUserByUsername
import api.toEntity

/**
 * Outstanding password reset links. Only a SHA-256 of each token is stored, so a leaked table can't
 * be used to reset anyone's password; the token itself only ever exists in the email.
 */
object PasswordResets : Table("password_resets") {
    val tokenHash = varchar("token_hash", 64)
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val createdAt = long("created_at")
    val expiresAt = long("expires_at")

    override val primaryKey = PrimaryKey(tokenHash)
}

object PasswordReset {
    /** How long a reset link works. */
    const val TTL_MS = 60L * 60 * 1000

    /** Most links one account can be sent per hour, so the form can't be used to spam an inbox. */
    const val MAX_PER_HOUR = 3

    /** Most accounts one email address gets links for, when several share it. */
    private const val MAX_ACCOUNTS = 5

    private val random = SecureRandom()

    /** Where reset links point; the web app serves the reset form there. */
    private val webUrl = (System.getenv("WEB_URL") ?: "https://beacc.app").trimEnd('/')

    /**
     * Email a reset link to the account [identifier] names: a username, or an email address (every
     * account using it, up to [MAX_ACCOUNTS]). Says nothing about whether an account was found, so
     * it can't be used to discover who has one.
     */
    fun request(identifier: String, now: Long = System.currentTimeMillis()) {
        val trimmed = identifier.trim()
        if (trimmed.isEmpty()) Error.text("enter your username or email")
        if (trimmed.length > 320) return

        val users = findUserByUsername(trimmed)?.let(::listOf) ?: usersByEmail(trimmed)
        users.forEach { user ->
            val token = issue(user.id, now) ?: return@forEach
            Mail.sendLater(resetEmail(user, token))
        }
    }

    /**
     * Set a new password using a reset [token]. The token works once; every other outstanding link
     * for the account is cancelled and every session signed out, so whoever had access before the
     * reset doesn't keep it.
     */
    fun reset(token: String, newPassword: String, now: Long = System.currentTimeMillis()) {
        val hash = sha256(token)
        val userID =
            transaction {
                PasswordResets.selectAll()
                    .where { (PasswordResets.tokenHash eq hash) and (PasswordResets.expiresAt greater now) }
                    .firstOrNull()
                    ?.get(PasswordResets.userID)
            } ?: Error.text("this reset link is invalid or has expired")

        val errors = Auth.passwordErrors(newPassword)
        if (errors.isNotEmpty()) MultiError.texts(errors)

        val passwordHash = BCrypt.withDefaults().hashToString(12, newPassword.toCharArray())
        transaction {
            // Claim the token first; a concurrent reset with the same link finds it gone.
            val claimed = PasswordResets.deleteWhere { it.run { PasswordResets.tokenHash eq hash } }
            if (claimed == 0) Error.text("this reset link is invalid or has expired")
            Users.update({ Users.id eq userID }) { it[Users.password] = passwordHash }
            PasswordResets.deleteWhere { it.run { PasswordResets.userID eq userID } }
        }
        deleteAllTokensForUser(userID)
    }

    /** A new token for [userID], or null if it's been sent [MAX_PER_HOUR] already. */
    private fun issue(userID: UUID, now: Long): String? = transaction {
        // Expired links are dead weight; clear this account's while we're here.
        PasswordResets.deleteWhere {
            it.run { (PasswordResets.userID eq userID) and (PasswordResets.expiresAt lessEq now) }
        }
        val recent =
            PasswordResets.selectAll()
                .where { (PasswordResets.userID eq userID) and (PasswordResets.createdAt greater now - TTL_MS) }
                .count()
        if (recent >= MAX_PER_HOUR) return@transaction null

        val token = HexFormat.of().formatHex(ByteArray(32).also(random::nextBytes))
        PasswordResets.insert {
            it[tokenHash] = sha256(token)
            it[PasswordResets.userID] = userID
            it[createdAt] = now
            it[expiresAt] = now + TTL_MS
        }
        token
    }

    private fun usersByEmail(email: String): List<User> = transaction {
        Users.selectAll()
            .where { Users.email.lowerCase() eq email.lowercase() }
            .limit(MAX_ACCOUNTS)
            .map { it.toEntity<User>() }
    }

    private fun resetEmail(user: User, token: String): Email {
        val link = "$webUrl/reset-password?token=$token"
        val text =
            """
            Hi ${user.username},

            Someone asked to reset the password for your Beacc account. To choose a new one, open this link within the next hour:

            $link

            If it wasn't you, ignore this email and your password stays the same.
            """.trimIndent()
        val name = escapeHtml(user.username)
        val html =
            """
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.5;color:#1c1714;max-width:480px">
              <p>Hi $name,</p>
              <p>Someone asked to reset the password for your Beacc account. To choose a new one, use this button within the next hour:</p>
              <p><a href="$link" style="display:inline-block;background:#1c1714;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">Reset password</a></p>
              <p style="color:#7b736c;font-size:13px">If it wasn't you, ignore this email and your password stays the same.</p>
            </div>
            """.trimIndent()
        return Email(user.email, "Reset your Beacc password", text, html)
    }

    private fun escapeHtml(s: String) =
        s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")

    private fun sha256(token: String): String =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.toByteArray()))
}
