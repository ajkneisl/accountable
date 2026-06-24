package integrations.api

import api.suspendTransaction
import integrations.AppleFitnessTable
import integrations.rebuildAppleFitnessRollup
import java.util.UUID
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.selectAll
import user.zoneOf

/**
 * Re-align [userID]'s per-day integration data to their current timezone after a zone change.
 *
 * Per-day rows are keyed by local midnight, so changing zones re-keys every day and leaves the old
 * rows behind as duplicates. Apple Fitness is rebuilt losslessly from its workout events (which
 * store the true instant). The other rollups only hold daily aggregates fetched per the upstream
 * day, which can't be re-bucketed precisely; their rows that no longer sit on a local midnight are
 * stale duplicates and are dropped. (LeetCode's correctly-keyed rows are refilled by its backfill;
 * GitHub re-refreshes today on next view.)
 */
suspend fun realignDayBuckets(userID: UUID) {
    rebuildAppleFitnessRollup(userID)

    val zone = zoneOf(userID)
    suspendTransaction {
        IntegrationTables.all.forEach { table ->
            if (table === AppleFitnessTable) return@forEach
            val stale =
                table
                    .selectAll()
                    .where { table.userID eq userID }
                    .map { it[table.date] }
                    .filter { startOfDay(it, zone) != it }
            stale.forEach { staleDate ->
                table.deleteWhere {
                    it.run { (table.userID eq userID) and (table.date eq staleDate) }
                }
            }
        }
    }
}
