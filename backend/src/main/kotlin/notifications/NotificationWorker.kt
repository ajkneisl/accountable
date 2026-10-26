package notifications

import integrations.api.IntegrationRefreshWorker
import integrations.api.millisUntilNextHour
import io.ktor.util.logging.KtorSimpleLogger
import java.time.DayOfWeek
import java.time.Instant
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import user.zoneOf

private val log = KtorSimpleLogger("NotificationWorker")

/** Local hour (24h) of the [NotificationKind.GOALS_STATUS] check-in — 5pm. */
const val GOALS_STATUS_HOUR = 17

/** Local hour (24h) of the [NotificationKind.STREAK_RISK] reminder — 9pm. */
const val STREAK_RISK_HOUR = 21

/** Local hour (24h) on Monday of the [NotificationKind.COMPETITION_RECAP] — 9am. */
const val COMPETITION_RECAP_HOUR = 9

/**
 * Hourly background worker that sends each user's scheduled notifications as their local clock
 * reaches each one's hour. Like [IntegrationRefreshWorker], it wakes at the top of each UTC hour,
 * so every user's local hour comes round exactly once a day.
 */
object NotificationWorker {
    /** Launch the worker on [scope] (the Ktor [io.ktor.server.application.Application] scope). */
    fun start(scope: CoroutineScope) {
        if (!Apns.enabled) return
        scope.launch {
            log.info("notification worker started")
            while (isActive) {
                delay(millisUntilNextHour())
                runCatching { sendDue() }.onFailure { log.error("notification sweep failed", it) }
            }
        }
    }

    /** Send what's due at [now] to every user with a device. One user failing doesn't stop the rest. */
    suspend fun sendDue(now: Long = System.currentTimeMillis()) {
        for ((userID, devices) in allDevices()) {
            runCatching { pushesDue(userID, now).forEach { Apns.send(devices, it) } }
                .onFailure { log.warn("notifications failed: user=$userID", it) }
        }
    }

    /** The notifications [userID] is due at [now], skipping kinds they've switched off. */
    suspend fun pushesDue(userID: UUID, now: Long): List<Push> {
        val local = Instant.ofEpochMilli(now).atZone(zoneOf(userID))
        val due =
            buildSet {
                if (local.hour == GOALS_STATUS_HOUR) add(NotificationKind.GOALS_STATUS)
                if (local.hour == STREAK_RISK_HOUR) add(NotificationKind.STREAK_RISK)
                if (local.dayOfWeek == DayOfWeek.MONDAY && local.hour == COMPETITION_RECAP_HOUR) {
                    add(NotificationKind.COMPETITION_RECAP)
                }
            } - optOutsFor(userID)
        if (due.isEmpty()) return emptyList()

        // Goal progress has to be current to be worth reporting; otherwise it's as of 11pm.
        if (NotificationKind.GOALS_STATUS in due || NotificationKind.STREAK_RISK in due) {
            IntegrationRefreshWorker.refreshUser(userID, now)
        }
        return due.flatMap { kind ->
            when (kind) {
                NotificationKind.GOALS_STATUS -> listOfNotNull(goalsStatus(userID, now))
                NotificationKind.STREAK_RISK -> listOfNotNull(streakRisk(userID, now))
                NotificationKind.COMPETITION_RECAP -> competitionRecaps(userID, now)
            }
        }
    }
}
