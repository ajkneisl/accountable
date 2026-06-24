package features.goals

import api.MappedTable
import api.suspendTransaction
import api.toEntity
import java.util.UUID
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.upsert
import kotlinx.serialization.Serializable
import user.Users

/** How often a [Goal] resets. */
@Serializable
enum class GoalPeriod {
    DAILY,
    WEEKLY,
}

/**
 * Table that contains [Goal]. One row per (user, integration, metric, period), enforced via the
 * composite primary key.
 */
object Goals : Table("goals") {
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)

    /** Provider name, matches [integrations.api.Integration.name] (e.g. `"github"`). */
    val integration = varchar("integration", 32)

    /** Metric key on the integration's table (e.g. `"commits"`, `"easy"`). */
    val metric = varchar("metric", 32)

    val period = enumerationByName("period", 16, GoalPeriod::class)

    /** Target count the user wants to hit within each [period] window. */
    val target = long("target")

    val createdAt = long("created_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(userID, integration, metric, period)
}

/**
 * A goal a user has set for an integration metric.
 *
 * @param userID Owner of the goal.
 * @param integration Provider name; matches [integrations.api.Integration.name].
 * @param metric Metric key on the integration; must be registered in [GoalMetrics].
 * @param period How often the goal resets.
 * @param target Target count to hit each [period] window. Must be positive.
 * @param createdAt Ms epoch when the goal was created.
 */
@MappedTable(Goals::class)
data class Goal(
    val userID: UUID,
    override val integration: String,
    override val metric: String,
    override val period: GoalPeriod,
    override val target: Long,
    val createdAt: Long,
) : GoalDefinition

/** Insert or replace a goal. Idempotent on (userID, integration, metric, period). */
suspend fun upsertGoal(
    userID: UUID,
    integration: String,
    metric: String,
    period: GoalPeriod,
    target: Long,
): Goal = suspendTransaction {
    val createdAt = System.currentTimeMillis()
    Goals.upsert {
        it[Goals.userID] = userID
        it[Goals.integration] = integration
        it[Goals.metric] = metric
        it[Goals.period] = period
        it[Goals.target] = target
        it[Goals.createdAt] = createdAt
    }
    Goal(userID, integration, metric, period, target, createdAt)
}

/** All goals owned by [userID], newest first. */
suspend fun goalsFor(userID: UUID): List<Goal> = suspendTransaction {
    Goals.selectAll()
        .where { Goals.userID eq userID }
        .orderBy(Goals.createdAt, SortOrder.DESC)
        .map { it.toEntity<Goal>() }
}

/** A single goal by its composite key, or null if [userID] has no such goal. */
suspend fun goalFor(
    userID: UUID,
    integration: String,
    metric: String,
    period: GoalPeriod,
): Goal? = suspendTransaction {
    Goals.selectAll()
        .where {
            (Goals.userID eq userID) and
                (Goals.integration eq integration) and
                (Goals.metric eq metric) and
                (Goals.period eq period)
        }
        .limit(1)
        .firstOrNull()
        ?.toEntity<Goal>()
}

/** Delete a single goal. Returns true if a row was removed. */
suspend fun deleteGoal(
    userID: UUID,
    integration: String,
    metric: String,
    period: GoalPeriod,
): Boolean = suspendTransaction {
    Goals.deleteWhere {
        it.run {
            (Goals.userID eq userID) and
                (Goals.integration eq integration) and
                (Goals.metric eq metric) and
                (Goals.period eq period)
        }
    } > 0
}
