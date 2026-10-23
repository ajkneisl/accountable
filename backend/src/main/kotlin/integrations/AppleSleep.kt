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
 * Minutes asleep per day, keyed by the local day the sleep ended in (so a night's sleep counts
 * toward the morning you wake up). Written only by [importSleep]: the iOS app reads HealthKit,
 * merges overlapping samples from every source into one total per day, and posts those totals.
 */
object AppleSleepTable : IntegrationTable("integrations_apple_sleep") {
    val minutes = long("minutes")
}

object AppleSleep : Integration<AppleSleep.AppleSleepData> {
    override val name = "apple_sleep"
    override val table = AppleSleepTable

    /** Placeholder externalID; like [AppleFitness], sleep has no upstream account to link. */
    const val HEALTH_SOURCE = "apple_health"

    /** There's no upstream to pull from — the phone pushes totals — so this reads what's stored. */
    override suspend fun pullData(userID: UUID, date: Long): AppleSleepData {
        val dayStart = startOfDay(date, zoneOf(userID))
        return getDay(userID, dayStart)?.data ?: AppleSleepData(date = dayStart, minutes = 0)
    }

    /**
     * Nothing to fetch, so a "refresh" only makes sure the day has a row and never overwrites an
     * imported total — the 11pm sweep and the integration GET route both call this.
     */
    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<AppleSleepData> {
        val dayStart = startOfDay(date, zoneOf(userID))
        suspendTransaction {
            AppleSleepTable.insertIgnore {
                it[AppleSleepTable.userID] = userID
                it[AppleSleepTable.date] = dayStart
                it[AppleSleepTable.minutes] = 0
            }
        }
        return getDay(userID, dayStart)!!
    }

    override suspend fun getDay(userID: UUID, date: Long): IntegrationRecord<AppleSleepData>? {
        val dayStart = startOfDay(date, zoneOf(userID))
        return suspendTransaction {
            AppleSleepTable.selectAll()
                .where { (AppleSleepTable.userID eq userID) and (AppleSleepTable.date eq dayStart) }
                .limit(1)
                .firstOrNull()
                ?.let {
                    IntegrationRecord(
                        data =
                            AppleSleepData(
                                date = it[AppleSleepTable.date],
                                minutes = it[AppleSleepTable.minutes],
                            ),
                        fetchedAt = it[AppleSleepTable.fetchedAt],
                    )
                }
        }
    }

    override suspend fun history(userID: UUID, since: Long): List<AppleSleepData> =
        suspendTransaction {
            AppleSleepTable.selectAll()
                .where { (AppleSleepTable.userID eq userID) and (AppleSleepTable.date greaterEq since) }
                .orderBy(AppleSleepTable.date, SortOrder.DESC)
                .map {
                    AppleSleepData(
                        date = it[AppleSleepTable.date],
                        minutes = it[AppleSleepTable.minutes],
                    )
                }
        }

    @Serializable
    @SerialName("apple_sleep")
    data class AppleSleepData(override val date: Long, val minutes: Long) : IntegrationData()
}

/** One day's sleep total handed to [importSleep]. */
@Serializable
data class ImportedSleepDay(
    /** Ms epoch when the day's last sleep ended; it decides which local day the total lands on. */
    val endedAt: Long,
    val minutes: Long,
)

/**
 * Store Apple Health sleep totals for [userID], replacing whatever each day held before — the app
 * always sends a day's complete total, so re-sending an overlapping window is safe. Auto-enables
 * the integration. Returns how many days' totals changed, so a re-send of the same data reports 0.
 */
suspend fun importSleep(userID: UUID, days: List<ImportedSleepDay>): Int {
    if (days.isEmpty()) return 0
    val zone = zoneOf(userID)
    // Two entries can land on the same local day if the phone's zone differs from the account's.
    val byDay =
        days.groupBy { startOfDay(it.endedAt, zone) }.mapValues { (_, d) -> d.sumOf { it.minutes } }
    val now = System.currentTimeMillis()
    return suspendTransaction {
        val stored =
            AppleSleepTable.selectAll()
                .where {
                    (AppleSleepTable.userID eq userID) and (AppleSleepTable.date inList byDay.keys)
                }
                .associate { it[AppleSleepTable.date] to it[AppleSleepTable.minutes] }
        UserIntegrations.upsert {
            it[UserIntegrations.userID] = userID
            it[UserIntegrations.integration] = AppleSleep.name
            it[UserIntegrations.externalID] = AppleSleep.HEALTH_SOURCE
        }
        byDay.forEach { (day, minutes) ->
            AppleSleepTable.upsert {
                it[AppleSleepTable.userID] = userID
                it[AppleSleepTable.date] = day
                it[AppleSleepTable.minutes] = minutes
                it[AppleSleepTable.fetchedAt] = now
            }
        }
        byDay.count { (day, minutes) -> stored[day] != minutes }
    }
}
