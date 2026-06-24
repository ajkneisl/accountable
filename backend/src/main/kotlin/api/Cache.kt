package api

import io.ktor.util.logging.KtorSimpleLogger
import java.net.URI
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import org.apache.commons.pool2.impl.GenericObjectPoolConfig
import redis.clients.jedis.Jedis
import redis.clients.jedis.JedisPool

/**
 * Redis-backed read cache for expensive per-user and per-competition views.
 *
 * Enabled only when `REDIS_URL` is set (e.g. `redis://redis:6379`); otherwise every call falls
 * straight through to the compute block, so local dev and tests run cache-free with zero setup.
 * Every Redis operation is wrapped so that a slow or unreachable Redis degrades to a direct
 * computation rather than failing the request — caching is a speed-up, never a dependency.
 *
 * Invalidation uses a monotonic *version tag* per user (and per competition): cache keys embed the
 * current tag, and [invalidateUser]/[invalidateCompetition] simply `INCR` the tag so every entry
 * under the old tag is instantly orphaned (and later evicted by TTL). This avoids enumerating or
 * scanning keys on every mutation.
 */
object Cache {
    private val log = KtorSimpleLogger("Cache")
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    /**
     * TTL for per-user views; correctness is driven by explicit invalidation, this only bounds
     * drift.
     */
    const val USER_TTL_SECONDS = 120L

    /** TTL for competition views — shorter, since they reflect other members' live activity. */
    const val COMPETITION_TTL_SECONDS = 60L

    private val pool: JedisPool? = initPool()

    private fun initPool(): JedisPool? {
        val url = System.getenv("REDIS_URL")
        val username = System.getenv("REDIS_USER")
        val password = System.getenv("REDIS_PASS")
        if (url.isNullOrBlank() || username.isNullOrBlank() || password.isNullOrBlank()) {
            log.info("REDIS_URL not set; cache disabled")
            return null
        }
        return runCatching {
                val uri = URI(url)
                val port = if (uri.port > 0) uri.port else 6379
                JedisPool(GenericObjectPoolConfig(), uri.host, port, username, password).also {
                    log.info("redis cache enabled at ${uri.host}:$port")
                }
            }
            .onFailure { log.warn("redis init failed; cache disabled", it) }
            .getOrNull()
    }

    private val enabled: Boolean
        get() = pool != null

    /** Get-or-compute a per-user view, namespaced by the user's current version tag. */
    suspend fun <T> cachedForUser(
        userID: UUID,
        name: String,
        serializer: KSerializer<T>,
        ttlSeconds: Long = USER_TTL_SECONDS,
        compute: suspend () -> T,
    ): T = cached("u:$userID:${version("uver:$userID")}:$name", ttlSeconds, serializer, compute)

    /**
     * Get-or-compute a per-competition view, namespaced by the competition's current version tag.
     */
    suspend fun <T> cachedForCompetition(
        competitionID: UUID,
        name: String,
        serializer: KSerializer<T>,
        ttlSeconds: Long = COMPETITION_TTL_SECONDS,
        compute: suspend () -> T,
    ): T =
        cached(
            "c:$competitionID:${version("cver:$competitionID")}:$name",
            ttlSeconds,
            serializer,
            compute,
        )

    /** Orphan every cached view for [userID] (goals, streak, integrations, competitions list…). */
    suspend fun invalidateUser(userID: UUID) = bump("uver:$userID")

    /** Orphan every cached view for [competitionID] (detail + week boards). */
    suspend fun invalidateCompetition(competitionID: UUID) = bump("cver:$competitionID")

    // -- internals -------------------------------------------------------------------------------

    private suspend fun <T> cached(
        key: String,
        ttlSeconds: Long,
        serializer: KSerializer<T>,
        compute: suspend () -> T,
    ): T {
        if (!enabled) return compute()

        redis { it.get(key) }
            ?.let { raw ->
                runCatching {
                        return json.decodeFromString(serializer, raw)
                    }
                    .onFailure { log.warn("cache decode failed for $key; recomputing", it) }
            }

        val value = compute()
        val encoded = runCatching { json.encodeToString(serializer, value) }.getOrNull()
        if (encoded != null) redis { it.setex(key, ttlSeconds, encoded) }
        return value
    }

    /** Current version tag for [tagKey], or "0" when never invalidated / Redis unavailable. */
    private suspend fun version(tagKey: String): String = redis { it.get(tagKey) } ?: "0"

    private suspend fun bump(tagKey: String) {
        redis { it.incr(tagKey) }
    }

    /**
     * Run [op] against a pooled connection, swallowing any failure so caching can't break a
     * request.
     */
    private suspend fun <R> redis(op: (Jedis) -> R): R? {
        val p = pool ?: return null
        return withContext(Dispatchers.IO) {
            runCatching { p.resource.use(op) }
                .onFailure { log.warn("redis op failed; degrading", it) }
                .getOrNull()
        }
    }
}
