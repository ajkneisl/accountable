package api

import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.builtins.serializer

/**
 * Live cache behavior, exercised only when `REDIS_URL` points at a reachable Redis (otherwise the
 * test self-skips, mirroring the app's graceful-degradation design). Verifies that a per-user view
 * is computed once, served from cache thereafter, and recomputed after invalidation.
 */
class CacheTest {
    @Test
    fun `caches per user and recomputes after invalidation`() = runBlocking {
        if (System.getenv("REDIS_URL").isNullOrBlank()) return@runBlocking // no Redis → skip

        val user = UUID.randomUUID()
        var computes = 0
        suspend fun load(): Int =
            Cache.cachedForUser(user, "test", Int.serializer()) {
                computes++
                42
            }

        assertEquals(42, load())
        assertEquals(1, computes, "first call computes")

        assertEquals(42, load())
        assertEquals(1, computes, "second call served from cache")

        Cache.invalidateUser(user)

        assertEquals(42, load())
        assertEquals(2, computes, "recomputes after invalidation")
    }
}
