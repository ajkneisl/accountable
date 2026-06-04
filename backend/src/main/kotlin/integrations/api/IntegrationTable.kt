package integrations.api

import integrations.AppleFitness
import integrations.AppleFitnessTable
import integrations.GitHub
import integrations.GitHubTable
import integrations.LeetCode
import integrations.LeetCodeTable
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import user.Users

/**
 * Base for per-integration tables. Each row represents a single (user, day) bucket, where the day
 * boundary is the user's configured timezone (see [startOfDay] / [user.zoneOf]).
 *
 * @param name SQL table name.
 */
abstract class IntegrationTable(name: String) : Table(name) {
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)

    /** Start-of-day in the user's timezone, ms epoch via [startOfDay]. */
    val date = long("date")

    /** Last time this row was refreshed from the upstream provider. */
    val fetchedAt = long("fetched_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(userID, date)
}

/** Normalize any ms-epoch timestamp to the start of its calendar day in [zone]. */
fun startOfDay(epochMs: Long, zone: ZoneId): Long =
    Instant.ofEpochMilli(epochMs)
        .atZone(zone)
        .toLocalDate()
        .atStartOfDay(zone)
        .toInstant()
        .toEpochMilli()

/** Normalize any ms-epoch timestamp to the start of its UTC calendar day. */
fun startOfUtcDay(epochMs: Long): Long = startOfDay(epochMs, ZoneOffset.UTC)

/** Registry of every integration's table. */
object IntegrationTables {
    val all: List<IntegrationTable> = listOf(GitHubTable, LeetCodeTable, AppleFitnessTable)
}

/** Registry of every [Integration] instance, indexed by [Integration.name]. */
object Integrations {
    val all: List<Integration<*>> = listOf(GitHub, LeetCode, AppleFitness)
    val byName: Map<String, Integration<*>> = all.associateBy { it.name }
}
