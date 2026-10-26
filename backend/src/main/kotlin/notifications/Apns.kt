package notifications

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import io.ktor.util.logging.KtorSimpleLogger
import java.io.File
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.security.KeyFactory
import java.security.interfaces.ECPrivateKey
import java.security.spec.PKCS8EncodedKeySpec
import java.time.Duration
import java.util.Base64
import java.util.Date
import kotlinx.coroutines.future.await
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject

private val log = KtorSimpleLogger("Apns")

private const val PRODUCTION_HOST = "https://api.push.apple.com"
private const val SANDBOX_HOST = "https://api.sandbox.push.apple.com"

/** APNs accepts a provider token for an hour; renew well before. */
private const val TOKEN_TTL_MS = 50L * 60 * 1000

/** A notification that's still undelivered after this is dropped rather than shown late. */
private const val EXPIRY_MS = 3L * 60 * 60 * 1000

/**
 * One notification.
 *
 * @param title Bold first line.
 * @param body The message.
 * @param path App route opened when it's tapped, e.g. `/competition/<id>`.
 * @param thread Groups notifications of the same kind (and competition) in Notification Center.
 */
data class Push(val title: String, val body: String, val path: String? = null, val thread: String? = null)

/** What APNs made of one send. */
private enum class Outcome {
    SENT,

    /** The token is dead: the app was deleted, or notifications were revoked for good. */
    GONE,

    /** The token is fine but belongs to the other environment (sandbox vs production). */
    WRONG_ENVIRONMENT,
    FAILED,
}

/**
 * Sends pushes straight to Apple Push Notification service with token-based (.p8) auth. Configured
 * from the environment and, like [api.Cache], self-disables when it isn't, so development and
 * tests need no Apple credentials:
 * - `APNS_KEY` (the .p8 file's contents) or `APNS_KEY_FILE` (its path)
 * - `APNS_KEY_ID`, `APNS_TEAM_ID`
 * - `APNS_TOPIC`, the app's bundle id (default `app.umn.acc`)
 */
object Apns {
    private class Config(val key: ECPrivateKey, val keyID: String, val teamID: String, val topic: String)

    private val config: Config? = loadConfig()

    /** APNs requires HTTP/2, which the JDK client speaks (Ktor's CIO client doesn't). */
    private val http: HttpClient by lazy {
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .connectTimeout(Duration.ofSeconds(10))
            .build()
    }

    @Volatile private var providerToken: Pair<String, Long>? = null

    val enabled: Boolean
        get() = config != null

    /**
     * Send [push] to each of [devices]. A token APNs rejects as belonging to the other environment
     * is retried there and remembered; a dead one is deleted.
     */
    suspend fun send(devices: List<PushDevice>, push: Push) {
        val config = config ?: return
        val payload = payload(push)
        for (device in devices) {
            when (send(config, device.token, device.sandbox, payload)) {
                Outcome.GONE -> deleteDevice(device.token)
                Outcome.WRONG_ENVIRONMENT ->
                    when (send(config, device.token, !device.sandbox, payload)) {
                        Outcome.SENT -> setDeviceSandbox(device.token, !device.sandbox)
                        // Bad in both environments: not a real token.
                        Outcome.GONE, Outcome.WRONG_ENVIRONMENT -> deleteDevice(device.token)
                        Outcome.FAILED -> {}
                    }
                Outcome.SENT, Outcome.FAILED -> {}
            }
        }
    }

    private suspend fun send(config: Config, token: String, sandbox: Boolean, payload: String): Outcome {
        val host = if (sandbox) SANDBOX_HOST else PRODUCTION_HOST
        val request =
            HttpRequest.newBuilder(URI("$host/3/device/$token"))
                .timeout(Duration.ofSeconds(15))
                .header("authorization", "bearer ${providerToken(config)}")
                .header("apns-topic", config.topic)
                .header("apns-push-type", "alert")
                .header("apns-priority", "10")
                .header(
                    "apns-expiration",
                    ((System.currentTimeMillis() + EXPIRY_MS) / 1000).toString(),
                )
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build()

        val response =
            runCatching { http.sendAsync(request, HttpResponse.BodyHandlers.ofString()).await() }
                .getOrElse {
                    log.warn("APNs request failed", it)
                    return Outcome.FAILED
                }
        if (response.statusCode() == 200) return Outcome.SENT

        val reason = reasonOf(response.body())
        return when {
            response.statusCode() == 410 || reason == "Unregistered" -> Outcome.GONE
            reason == "BadDeviceToken" -> Outcome.WRONG_ENVIRONMENT
            else -> {
                log.warn("APNs rejected a push: ${response.statusCode()} $reason")
                Outcome.FAILED
            }
        }
    }

    /** The signed JWT APNs authenticates the provider with, reused until it nears expiry. */
    private fun providerToken(config: Config): String {
        val now = System.currentTimeMillis()
        providerToken?.let { (token, issuedAt) -> if (now - issuedAt < TOKEN_TTL_MS) return token }
        val token =
            JWT.create()
                .withKeyId(config.keyID)
                .withIssuer(config.teamID)
                .withIssuedAt(Date(now))
                .sign(Algorithm.ECDSA256(null, config.key))
        providerToken = token to now
        return token
    }

    private fun payload(push: Push): String =
        buildJsonObject {
                putJsonObject("aps") {
                    putJsonObject("alert") {
                        put("title", push.title)
                        put("body", push.body)
                    }
                    put("sound", "default")
                    push.thread?.let { put("thread-id", it) }
                }
                // expo-notifications hands the app a remote push's `body` as its data.
                push.path?.let { path -> putJsonObject("body") { put("path", path) } }
            }
            .toString()

    private fun reasonOf(body: String): String? =
        runCatching { Json.parseToJsonElement(body).jsonObject["reason"]?.jsonPrimitive?.content }
            .getOrNull()

    private fun loadConfig(): Config? {
        val pem =
            System.getenv("APNS_KEY")
                ?: System.getenv("APNS_KEY_FILE")?.let { runCatching { File(it).readText() }.getOrNull() }
        val keyID = System.getenv("APNS_KEY_ID")
        val teamID = System.getenv("APNS_TEAM_ID")
        if (pem.isNullOrBlank() || keyID.isNullOrBlank() || teamID.isNullOrBlank()) {
            log.info("APNs not configured; push notifications are disabled")
            return null
        }
        val key =
            runCatching { parseKey(pem) }
                .getOrElse {
                    log.error("APNS_KEY isn't a valid .p8 key; push notifications are disabled", it)
                    return null
                }
        return Config(key, keyID, teamID, System.getenv("APNS_TOPIC") ?: "app.umn.acc")
    }

    /** A .p8 file is a PEM-wrapped PKCS#8 EC key. Escaped newlines (from a one-line env var) are fine. */
    private fun parseKey(pem: String): ECPrivateKey {
        val base64 =
            pem.replace("\\n", "\n")
                .lines()
                .filterNot { it.startsWith("-----") }
                .joinToString("")
                .trim()
        val spec = PKCS8EncodedKeySpec(Base64.getDecoder().decode(base64))
        return KeyFactory.getInstance("EC").generatePrivate(spec) as ECPrivateKey
    }
}
