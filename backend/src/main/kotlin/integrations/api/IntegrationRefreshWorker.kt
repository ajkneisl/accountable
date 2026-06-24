package integrations.api

import api.Cache
import io.ktor.util.logging.KtorSimpleLogger
import java.time.Instant
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import user.zoneOf

private val log = KtorSimpleLogger("IntegrationRefreshWorker")

private const val HOUR_MS = 60L * 60 * 1000

/** Local hour (24h) at which each user's daily refresh sweep runs — 11pm. */
const val REFRESH_HOUR = 23

/**
 * Hourly background worker that refreshes every enabled integration for the users whose local clock
 * has just reached [REFRESH_HOUR] (11pm). Refreshing late in the evening captures each day's
 * near-final numbers, so historical totals stay correct even for users who never open the app.
 *
 * It wakes at the top of each UTC hour and acts on users currently in their local `23:xx` hour.
 * Because zone offsets are whole- or fractional-hour, exactly one top-of-hour falls inside any
 * user's local 11pm hour, so each user is refreshed once per day.
 */
object IntegrationRefreshWorker {
    /** Launch the worker on [scope] (the Ktor [io.ktor.server.application.Application] scope). */
    fun start(scope: CoroutineScope) {
        scope.launch {
            log.info("integration refresh worker started")
            while (isActive) {
                delay(millisUntilNextHour())
                runCatching { refreshUsersAtRefreshHour() }
                    .onFailure { log.error("11pm refresh sweep failed", it) }
            }
        }
    }

    /**
     * Refresh enabled integrations for every user currently in the `23:00`–`23:59` hour of their
     * timezone, capturing today's near-final numbers. Exposed (and [now] overridable) for testing.
     * Per-user and per-integration failures are logged and skipped so one bad upstream call can't
     * abort the whole sweep.
     */
    suspend fun refreshUsersAtRefreshHour(now: Long = System.currentTimeMillis()) {
        for ((userID, names) in allEnabledIntegrations()) {
            if (Instant.ofEpochMilli(now).atZone(zoneOf(userID)).hour != REFRESH_HOUR) continue
            for (name in names) {
                val integration = Integrations.byName[name] ?: continue
                runCatching { integration.refresh(userID, now) }
                    .onFailure { log.warn("refresh failed: user=$userID integration=$name", it) }
            }
            // Fresh upstream data invalidates the user's cached goals, streak, and integrations.
            Cache.invalidateUser(userID)
        }
    }
}

/** Milliseconds from [now] until the next top of the (UTC) hour. */
internal fun millisUntilNextHour(now: Long = System.currentTimeMillis()): Long =
    HOUR_MS - (now % HOUR_MS)
