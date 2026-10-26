package integrations

import api.suspendTransaction
import integrations.api.Integration
import integrations.api.IntegrationRecord
import integrations.api.IntegrationTable
import integrations.api.UserIntegrations
import integrations.api.startOfDay
import java.util.UUID
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.insertIgnore
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.upsert
import user.zoneOf

/**
 * Minutes of screen time per local day. Written only by [importScreenTime]: the iOS app's
 * DeviceActivity monitor records each usage threshold the phone crosses, and the app posts the
 * highest one reached per day. Precision is the monitor's threshold step, not the minute.
 */
object ScreenTimeTable : IntegrationTable("integrations_screen_time") {
    val minutes = long("minutes")
}

object ScreenTime : Integration<ScreenTime.ScreenTimeData> {
    override val name = "screen_time"
    override val table = ScreenTimeTable

    /** Placeholder externalID; like [AppleSleep], screen time has no upstream account to link. */
    const val SCREEN_TIME_SOURCE = "apple_screen_time"

    /** There's no upstream to pull from — the phone pushes totals — so this reads what's stored. */
    override suspend fun pullData(userID: UUID, date: Long): ScreenTimeData {
        val dayStart = startOfDay(date, zoneOf(userID))
        return getDay(userID, dayStart)?.data ?: ScreenTimeData(date = dayStart, minutes = 0)
    }

    /**
     * Nothing to fetch, so a "refresh" only makes sure the day has a row and never overwrites an
     * imported total — the 11pm sweep and the integration GET route both call this.
     */
    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<ScreenTimeData> {
        val dayStart = startOfDay(date, zoneOf(userID))
        suspendTransaction {
            ScreenTimeTable.insertIgnore {
                it[ScreenTimeTable.userID] = userID
                it[ScreenTimeTable.date] = dayStart
                it[ScreenTimeTable.minutes] = 0
            }
        }
        return getDay(userID, dayStart)!!
    }

    override suspend fun getDay(userID: UUID, date: Long): IntegrationRecord<ScreenTimeData>? {
        val dayStart = startOfDay(date, zoneOf(userID))
        return suspendTransaction {
            ScreenTimeTable.selectAll()
                .where { (ScreenTimeTable.userID eq userID) and (ScreenTimeTable.date eq dayStart) }
                .limit(1)
                .firstOrNull()
                ?.let {
                    IntegrationRecord(
                        data =
                            ScreenTimeData(
                                date = it[ScreenTimeTable.date],
                                minutes = it[ScreenTimeTable.minutes],
                            ),
                        fetchedAt = it[ScreenTimeTable.fetchedAt],
                    )
                }
        }
    }

    override suspend fun history(userID: UUID, since: Long): List<ScreenTimeData> =
        suspendTransaction {
            ScreenTimeTable.selectAll()
                .where { (ScreenTimeTable.userID eq userID) and (ScreenTimeTable.date greaterEq since) }
                .orderBy(ScreenTimeTable.date, SortOrder.DESC)
                .map {
                    ScreenTimeData(
                        date = it[ScreenTimeTable.date],
                        minutes = it[ScreenTimeTable.minutes],
                    )
                }
        }

    @Serializable
    @SerialName("screen_time")
    data class ScreenTimeData(override val date: Long, val minutes: Long) : IntegrationData()
}

/** One day's screen time handed to [importScreenTime]. */
@Serializable
data class ImportedScreenTimeDay(
    /**
     * Any ms epoch inside the day; it decides which local day the total lands on. The app sends
     * local noon, so a phone a few hours off the account's zone still lands on the same date.
     */
    val day: Long,
    val minutes: Long,
)

/**
 * Store screen time totals for [userID]. A day's total only grows, so each day keeps the larger of
 * what's stored and what's posted: a phone whose record was reset (reconnected, reinstalled, a new
 * phone) can't lower a total it already reported, and re-sending an overlapping window is safe.
 * Auto-enables the integration. Returns how many days' totals rose, so a re-send reports 0.
 */
suspend fun importScreenTime(userID: UUID, days: List<ImportedScreenTimeDay>): Int {
    if (days.isEmpty()) return 0
    val zone = zoneOf(userID)
    // Each posted day is already a total so far, so a repeat of a day keeps the larger one.
    val posted =
        days.groupBy { startOfDay(it.day, zone) }.mapValues { (_, d) -> d.maxOf { it.minutes } }
    val now = System.currentTimeMillis()
    return suspendTransaction {
        val stored =
            ScreenTimeTable.selectAll()
                .where {
                    (ScreenTimeTable.userID eq userID) and (ScreenTimeTable.date inList posted.keys)
                }
                .associate { it[ScreenTimeTable.date] to it[ScreenTimeTable.minutes] }
        val raised = posted.filter { (day, minutes) -> minutes > (stored[day] ?: -1) }
        UserIntegrations.upsert {
            it[UserIntegrations.userID] = userID
            it[UserIntegrations.integration] = ScreenTime.name
            it[UserIntegrations.externalID] = ScreenTime.SCREEN_TIME_SOURCE
        }
        raised.forEach { (day, minutes) ->
            ScreenTimeTable.upsert {
                it[ScreenTimeTable.userID] = userID
                it[ScreenTimeTable.date] = day
                it[ScreenTimeTable.minutes] = minutes
                it[ScreenTimeTable.fetchedAt] = now
            }
        }
        raised.size
    }
}
