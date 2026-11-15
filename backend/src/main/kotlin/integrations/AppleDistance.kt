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
 * Distance walked and run per local day, in metres. Written only by [importDistance]: the iOS app
 * asks HealthKit for each day's total (already deduped across watch and phone) and posts those
 * totals. Goals are set in kilometres or miles, but both are held against this one figure.
 */
object AppleDistanceTable : IntegrationTable("integrations_apple_distance") {
    val meters = long("meters")
}

object AppleDistance : Integration<AppleDistance.AppleDistanceData> {
    override val name = "apple_distance"
    override val table = AppleDistanceTable

    /** Placeholder externalID; like [AppleSteps], distance has no upstream account to link. */
    const val HEALTH_SOURCE = "apple_health"

    /** There's no upstream to pull from — the phone pushes totals — so this reads what's stored. */
    override suspend fun pullData(userID: UUID, date: Long): AppleDistanceData {
        val dayStart = startOfDay(date, zoneOf(userID))
        return getDay(userID, dayStart)?.data ?: AppleDistanceData(date = dayStart, meters = 0)
    }

    /**
     * Nothing to fetch, so a "refresh" only makes sure the day has a row and never overwrites an
     * imported total — the 11pm sweep and the integration GET route both call this.
     */
    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<AppleDistanceData> {
        val dayStart = startOfDay(date, zoneOf(userID))
        suspendTransaction {
            AppleDistanceTable.insertIgnore {
                it[AppleDistanceTable.userID] = userID
                it[AppleDistanceTable.date] = dayStart
                it[AppleDistanceTable.meters] = 0
            }
        }
        return getDay(userID, dayStart)!!
    }

    override suspend fun getDay(userID: UUID, date: Long): IntegrationRecord<AppleDistanceData>? {
        val dayStart = startOfDay(date, zoneOf(userID))
        return suspendTransaction {
            AppleDistanceTable.selectAll()
                .where {
                    (AppleDistanceTable.userID eq userID) and (AppleDistanceTable.date eq dayStart)
                }
                .limit(1)
                .firstOrNull()
                ?.let {
                    IntegrationRecord(
                        data =
                            AppleDistanceData(
                                date = it[AppleDistanceTable.date],
                                meters = it[AppleDistanceTable.meters],
                            ),
                        fetchedAt = it[AppleDistanceTable.fetchedAt],
                    )
                }
        }
    }

    override suspend fun history(userID: UUID, since: Long): List<AppleDistanceData> =
        suspendTransaction {
            AppleDistanceTable.selectAll()
                .where {
                    (AppleDistanceTable.userID eq userID) and (AppleDistanceTable.date greaterEq since)
                }
                .orderBy(AppleDistanceTable.date, SortOrder.DESC)
                .map {
                    AppleDistanceData(
                        date = it[AppleDistanceTable.date],
                        meters = it[AppleDistanceTable.meters],
                    )
                }
        }

    @Serializable
    @SerialName("apple_distance")
    data class AppleDistanceData(override val date: Long, val meters: Long) : IntegrationData()
}

/** One day's distance handed to [importDistance]. */
@Serializable
data class ImportedDistanceDay(
    /**
     * Any ms epoch inside the day; it decides which local day the total lands on. The app sends
     * local noon, so a phone a few hours off the account's zone still lands on the same date.
     */
    val day: Long,
    val meters: Long,
)

/**
 * Store Apple Health distance totals for [userID], replacing whatever each day held before — the
 * app always sends a day's complete total, so re-sending an overlapping window is safe.
 * Auto-enables the integration. Returns how many days' totals changed, so a re-send of the same
 * data reports 0.
 */
suspend fun importDistance(userID: UUID, days: List<ImportedDistanceDay>): Int {
    if (days.isEmpty()) return 0
    val zone = zoneOf(userID)
    // Each posted day is already a complete total, so a repeat of a day keeps the larger one.
    val byDay =
        days.groupBy { startOfDay(it.day, zone) }.mapValues { (_, d) -> d.maxOf { it.meters } }
    val now = System.currentTimeMillis()
    return suspendTransaction {
        val stored =
            AppleDistanceTable.selectAll()
                .where {
                    (AppleDistanceTable.userID eq userID) and
                        (AppleDistanceTable.date inList byDay.keys)
                }
                .associate { it[AppleDistanceTable.date] to it[AppleDistanceTable.meters] }
        UserIntegrations.upsert {
            it[UserIntegrations.userID] = userID
            it[UserIntegrations.integration] = AppleDistance.name
            it[UserIntegrations.externalID] = AppleDistance.HEALTH_SOURCE
        }
        byDay.forEach { (day, meters) ->
            AppleDistanceTable.upsert {
                it[AppleDistanceTable.userID] = userID
                it[AppleDistanceTable.date] = day
                it[AppleDistanceTable.meters] = meters
                it[AppleDistanceTable.fetchedAt] = now
            }
        }
        byDay.count { (day, meters) -> stored[day] != meters }
    }
}
