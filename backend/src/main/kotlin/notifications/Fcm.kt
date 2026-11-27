package notifications

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import io.ktor.util.logging.KtorSimpleLogger
import java.io.File
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.security.KeyFactory
import java.security.interfaces.RSAPrivateKey
import java.security.spec.PKCS8EncodedKeySpec
import java.time.Duration
import java.util.Base64
import java.util.Date
import kotlinx.coroutines.future.await
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject

private val log = KtorSimpleLogger("Fcm")

private const val SCOPE = "https://www.googleapis.com/auth/firebase.messaging"

/** Google issues access tokens for an hour; renew well before. */
private const val TOKEN_RENEW_MS = 50L * 60 * 1000

/** Matches APNs' expiry: a notification still undelivered after this is dropped rather than shown late. */
private const val TTL_SECONDS = 3L * 60 * 60

/**
 * The Android notification channel pushes are posted to. The app creates it at startup (see the
 * app's notifications.ts); Android 8+ files a push for an unknown channel under a fallback one.
 */
const val FCM_CHANNEL_ID = "default"

/** What FCM made of one send. */
internal enum class FcmOutcome {
    SENT,

    /** The token is dead: the app was uninstalled, or the token was rotated or revoked. */
    GONE,
    FAILED,
}

/**
 * Sends pushes to Android devices through Firebase Cloud Messaging's HTTP v1 API, authenticating as
 * a Google service account. Configured from the environment and, like [Apns], self-disables when it
 * isn't, so development and tests need no Google credentials:
 * - `FCM_SERVICE_ACCOUNT` (the service account key JSON's contents) or `FCM_SERVICE_ACCOUNT_FILE`
 *   (its path). Its `project_id` picks the Firebase project.
 */
object Fcm {
    private class Config(
        val projectID: String,
        val clientEmail: String,
        val key: RSAPrivateKey,
        val tokenURI: String,
    )

    private val config: Config? = loadConfig()

    private val http: HttpClient by lazy {
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build()
    }

    @Volatile private var accessToken: Pair<String, Long>? = null

    val enabled: Boolean
        get() = config != null

    /** Send [push] to each of [devices]. A token FCM reports as dead is deleted. */
    suspend fun send(devices: List<PushDevice>, push: Push) {
        val config = config ?: return
        val bearer =
            runCatching { accessToken(config) }
                .getOrElse {
                    log.warn("couldn't get an FCM access token", it)
                    return
                }
        for (device in devices) {
            if (send(config, bearer, fcmPayload(device.token, push)) == FcmOutcome.GONE) {
                deleteDevice(device.token)
            }
        }
    }

    private suspend fun send(config: Config, bearer: String, payload: String): FcmOutcome {
        val request =
            HttpRequest.newBuilder(
                    URI("https://fcm.googleapis.com/v1/projects/${config.projectID}/messages:send")
                )
                .timeout(Duration.ofSeconds(15))
                .header("authorization", "Bearer $bearer")
                .header("content-type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build()
        val response =
            runCatching { http.sendAsync(request, HttpResponse.BodyHandlers.ofString()).await() }
                .getOrElse {
                    log.warn("FCM request failed", it)
                    return FcmOutcome.FAILED
                }
        val outcome = fcmOutcome(response.statusCode(), response.body())
        if (outcome == FcmOutcome.FAILED) {
            log.warn("FCM rejected a push: ${response.statusCode()} ${response.body().take(300)}")
        }
        if (response.statusCode() == 401) accessToken = null
        return outcome
    }

    /**
     * An OAuth access token for FCM, reused until it nears expiry. Got by signing a JWT as the
     * service account and trading it at Google's token endpoint (the "JWT bearer" grant).
     */
    private suspend fun accessToken(config: Config): String {
        val now = System.currentTimeMillis()
        accessToken?.let { (token, issuedAt) -> if (now - issuedAt < TOKEN_RENEW_MS) return token }

        val assertion =
            JWT.create()
                .withIssuer(config.clientEmail)
                .withAudience(config.tokenURI)
                .withClaim("scope", SCOPE)
                .withIssuedAt(Date(now))
                .withExpiresAt(Date(now + 60 * 60 * 1000))
                .sign(Algorithm.RSA256(null, config.key))
        val form =
            "grant_type=" +
                URLEncoder.encode("urn:ietf:params:oauth:grant-type:jwt-bearer", Charsets.UTF_8) +
                "&assertion=" +
                URLEncoder.encode(assertion, Charsets.UTF_8)
        val request =
            HttpRequest.newBuilder(URI(config.tokenURI))
                .timeout(Duration.ofSeconds(15))
                .header("content-type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build()
        val response = http.sendAsync(request, HttpResponse.BodyHandlers.ofString()).await()
        check(response.statusCode() == 200) {
            "token endpoint answered ${response.statusCode()}: ${response.body().take(300)}"
        }
        val body = Json.parseToJsonElement(response.body()).jsonObject
        val token = body.getValue("access_token").jsonPrimitive.content
        accessToken = token to now
        return token
    }

    private fun loadConfig(): Config? {
        val json =
            System.getenv("FCM_SERVICE_ACCOUNT")
                ?: System.getenv("FCM_SERVICE_ACCOUNT_FILE")?.let {
                    runCatching { File(it).readText() }.getOrNull()
                }
        if (json.isNullOrBlank()) {
            log.info("FCM not configured; Android push notifications are disabled")
            return null
        }
        return runCatching {
                val account = Json.parseToJsonElement(json).jsonObject
                fun field(name: String) = account.getValue(name).jsonPrimitive.content
                Config(
                    projectID = field("project_id"),
                    clientEmail = field("client_email"),
                    key = parseKey(field("private_key")),
                    tokenURI =
                        account["token_uri"]?.jsonPrimitive?.contentOrNull
                            ?: "https://oauth2.googleapis.com/token",
                )
            }
            .getOrElse {
                log.error("FCM_SERVICE_ACCOUNT isn't a valid service account key; Android pushes are disabled", it)
                null
            }
    }

    /** A service account's `private_key`: a PEM-wrapped PKCS#8 RSA key. Escaped newlines are fine. */
    private fun parseKey(pem: String): RSAPrivateKey {
        val base64 =
            pem.replace("\\n", "\n")
                .lines()
                .filterNot { it.startsWith("-----") }
                .joinToString("")
                .trim()
        val spec = PKCS8EncodedKeySpec(Base64.getDecoder().decode(base64))
        return KeyFactory.getInstance("RSA").generatePrivate(spec) as RSAPrivateKey
    }
}

/**
 * The FCM v1 message for [push] to [token]. The route a tap opens goes in `data`, both as `path` and
 * inside a JSON `body` (the shape expo-notifications unwraps into the notification's data, as it does
 * for the APNs payload), so the app finds it at `data.path` either way.
 */
internal fun fcmPayload(token: String, push: Push): String =
    buildJsonObject {
            putJsonObject("message") {
                put("token", token)
                putJsonObject("notification") {
                    put("title", push.title)
                    put("body", push.body)
                }
                push.path?.let { path ->
                    putJsonObject("data") {
                        put("path", path)
                        put("body", buildJsonObject { put("path", path) }.toString())
                    }
                }
                putJsonObject("android") {
                    put("priority", "HIGH")
                    put("ttl", "${TTL_SECONDS}s")
                    putJsonObject("notification") {
                        put("channel_id", FCM_CHANNEL_ID)
                        // A later push with the same tag replaces the earlier one, like iOS threads group them.
                        push.thread?.let { put("tag", it) }
                    }
                }
            }
        }
        .toString()

/**
 * Read an FCM v1 response. A dead token comes back as 404 or with the `UNREGISTERED` error code;
 * `INVALID_ARGUMENT` naming the token means it was never a real one.
 */
internal fun fcmOutcome(status: Int, body: String): FcmOutcome {
    if (status == 200) return FcmOutcome.SENT
    if (status == 404) return FcmOutcome.GONE
    val error =
        runCatching { Json.parseToJsonElement(body).jsonObject["error"]?.jsonObject }.getOrNull()
            ?: return FcmOutcome.FAILED
    val codes = buildList {
        error["status"]?.jsonPrimitive?.contentOrNull?.let(::add)
        error["details"]?.jsonArray?.forEach { detail ->
            (detail as? JsonObject)?.get("errorCode")?.jsonPrimitive?.contentOrNull?.let(::add)
        }
    }
    val message = error["message"]?.jsonPrimitive?.contentOrNull.orEmpty()
    return when {
        "UNREGISTERED" in codes -> FcmOutcome.GONE
        "INVALID_ARGUMENT" in codes && "registration token" in message.lowercase() -> FcmOutcome.GONE
        else -> FcmOutcome.FAILED
    }
}
