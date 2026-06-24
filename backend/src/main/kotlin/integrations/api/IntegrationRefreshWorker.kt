package integrations.api

import io.ktor.util.logging.KtorSimpleLogger
import java.time.Instant
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import user.zoneOf

private val log = KtorSimpleLogger("IntegrationRefreshWorker")

private const val HOUR_MS = 60L * 60 * 1000
private const val DAY_MS = 24L * HOUR_MS

/**
 * Hourly background worker that refreshes every enabled integration for the users whose local clock
 * has just crossed midnight. Refreshing at the day boundary finalizes the day that just ended and
 * seeds the new one, so historical numbers stay correct even for users who never open the app.
 *
 * It wakes at the top of each UTC hour and acts on users currently in their local `00:xx` hour.
 * Because zone offsets are whole- or fractional-hour, exactly one top-of-hour falls inside any
 * user's local midnight hour, so each user is refreshed once per day.
 */
object IntegrationRefreshWorker {
    /** Launch the worker on [scope] (the Ktor [io.ktor.server.application.Application] scope). */
    fun start(scope: CoroutineScope) {
        scope.launch {
            log.info("integration refresh worker started")
            while (isActive) {
                delay(millisUntilNextHour())
                runCatching { refreshUsersAtLocalMidnight() }
                    .onFailure { log.error("midnight refresh sweep failed", it) }
            }
        }
    }

    /**
     * Refresh enabled integrations for every user currently in the `00:00`–`00:59` hour of their
     * timezone. Exposed (and [now] overridable) for testing. Per-user and per-integration failures
     * are logged and skipped so one bad upstream call can't abort the whole sweep.
     */
    suspend fun refreshUsersAtLocalMidnight(now: Long = System.currentTimeMillis()) {
        for ((userID, names) in allEnabledIntegrations()) {
            if (Instant.ofEpochMilli(now).atZone(zoneOf(userID)).hour != 0) continue
            for (name in names) {
                val integration = Integrations.byName[name] ?: continue
                runCatching {
                    integration.refresh(userID, now - DAY_MS) // finalize the day that just ended
                    integration.refresh(userID, now) // seed the new day
                }
                    .onFailure { log.warn("refresh failed: user=$userID integration=$name", it) }
            }
        }
    }
}

/** Milliseconds from [now] until the next top of the (UTC) hour. */
internal fun millisUntilNextHour(now: Long = System.currentTimeMillis()): Long =
    HOUR_MS - (now % HOUR_MS)
