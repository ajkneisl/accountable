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
 * Steps per local day. Written only by [importSteps]: the iOS app asks HealthKit for each day's
 * step total (already deduped across watch and phone) and posts those totals.
 */
object AppleStepsTable : IntegrationTable("integrations_apple_steps") {
    val steps = long("steps")
}

object AppleSteps : Integration<AppleSteps.AppleStepsData> {
    override val name = "apple_steps"
    override val table = AppleStepsTable

    /** Placeholder externalID; like [AppleSleep], steps have no upstream account to link. */
    const val HEALTH_SOURCE = "apple_health"

    /** There's no upstream to pull from — the phone pushes totals — so this reads what's stored. */
    override suspend fun pullData(userID: UUID, date: Long): AppleStepsData {
        val dayStart = startOfDay(date, zoneOf(userID))
        return getDay(userID, dayStart)?.data ?: AppleStepsData(date = dayStart, steps = 0)
    }

    /**
     * Nothing to fetch, so a "refresh" only makes sure the day has a row and never overwrites an
     * imported total — the 11pm sweep and the integration GET route both call this.
     */
    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<AppleStepsData> {
        val dayStart = startOfDay(date, zoneOf(userID))
        suspendTransaction {
            AppleStepsTable.insertIgnore {
                it[AppleStepsTable.userID] = userID
                it[AppleStepsTable.date] = dayStart
                it[AppleStepsTable.steps] = 0
            }
        }
        return getDay(userID, dayStart)!!
    }

    override suspend fun getDay(userID: UUID, date: Long): IntegrationRecord<AppleStepsData>? {
        val dayStart = startOfDay(date, zoneOf(userID))
        return suspendTransaction {
            AppleStepsTable.selectAll()
                .where { (AppleStepsTable.userID eq userID) and (AppleStepsTable.date eq dayStart) }
                .limit(1)
                .firstOrNull()
                ?.let {
                    IntegrationRecord(
                        data =
                            AppleStepsData(
                                date = it[AppleStepsTable.date],
                                steps = it[AppleStepsTable.steps],
                            ),
                        fetchedAt = it[AppleStepsTable.fetchedAt],
                    )
                }
        }
    }

    override suspend fun history(userID: UUID, since: Long): List<AppleStepsData> =
        suspendTransaction {
            AppleStepsTable.selectAll()
                .where { (AppleStepsTable.userID eq userID) and (AppleStepsTable.date greaterEq since) }
                .orderBy(AppleStepsTable.date, SortOrder.DESC)
                .map {
                    AppleStepsData(
                        date = it[AppleStepsTable.date],
                        steps = it[AppleStepsTable.steps],
                    )
                }
        }

    @Serializable
    @SerialName("apple_steps")
    data class AppleStepsData(override val date: Long, val steps: Long) : IntegrationData()
}

/** One day's step total handed to [importSteps]. */
@Serializable
data class ImportedStepsDay(
    /**
     * Any ms epoch inside the day; it decides which local day the total lands on. The app sends
     * local noon, so a phone a few hours off the account's zone still lands on the same date.
     */
    val day: Long,
    val steps: Long,
)

/**
 * Store Apple Health step totals for [userID], replacing whatever each day held before — the app
 * always sends a day's complete total, so re-sending an overlapping window is safe. Auto-enables
 * the integration. Returns how many days' totals changed, so a re-send of the same data reports 0.
 */
suspend fun importSteps(userID: UUID, days: List<ImportedStepsDay>): Int {
    if (days.isEmpty()) return 0
    val zone = zoneOf(userID)
    // Each posted day is already a complete total, so a repeat of a day keeps the larger one.
    val byDay =
        days.groupBy { startOfDay(it.day, zone) }.mapValues { (_, d) -> d.maxOf { it.steps } }
    val now = System.currentTimeMillis()
    return suspendTransaction {
        val stored =
            AppleStepsTable.selectAll()
                .where {
                    (AppleStepsTable.userID eq userID) and (AppleStepsTable.date inList byDay.keys)
                }
                .associate { it[AppleStepsTable.date] to it[AppleStepsTable.steps] }
        UserIntegrations.upsert {
            it[UserIntegrations.userID] = userID
            it[UserIntegrations.integration] = AppleSteps.name
            it[UserIntegrations.externalID] = AppleSteps.HEALTH_SOURCE
        }
        byDay.forEach { (day, steps) ->
            AppleStepsTable.upsert {
                it[AppleStepsTable.userID] = userID
                it[AppleStepsTable.date] = day
                it[AppleStepsTable.steps] = steps
                it[AppleStepsTable.fetchedAt] = now
            }
        }
        byDay.count { (day, steps) -> stored[day] != steps }
    }
}
