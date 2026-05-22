package integrations.api

import integrations.GitHub
import integrations.GitHubTable
import integrations.LeetCode
import integrations.LeetCodeTable
import java.time.Instant
import java.time.ZoneOffset
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import user.Users

/**
 * Base for per-integration tables. Each row represents a single (user, UTC day) bucket.
 *
 * @param name SQL table name.
 */
abstract class IntegrationTable(name: String) : Table(name) {
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)

    /** Start-of-day in UTC, ms epoch via [startOfUtcDay] */
    val date = long("date")

    /** Last time this row was refreshed from the upstream provider. */
    val fetchedAt = long("fetched_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(userID, date)
}

/** Normalize any ms-epoch timestamp to the start of its UTC calendar day. */
fun startOfUtcDay(epochMs: Long): Long =
    Instant.ofEpochMilli(epochMs)
        .atOffset(ZoneOffset.UTC)
        .toLocalDate()
        .atStartOfDay(ZoneOffset.UTC)
        .toInstant()
        .toEpochMilli()

/** Registry of every integration's table. */
object IntegrationTables {
    val all: List<IntegrationTable> = listOf(GitHubTable, LeetCodeTable)
}

/** Registry of every [Integration] instance, indexed by [Integration.name]. */
object Integrations {
    val all: List<Integration<*>> = listOf(GitHub, LeetCode)
    val byName: Map<String, Integration<*>> = all.associateBy { it.name }
}
