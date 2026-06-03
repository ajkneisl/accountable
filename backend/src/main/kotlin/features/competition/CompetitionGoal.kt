package features.competition

import api.MappedTable
import api.suspendTransaction
import api.toEntity
import features.goals.GoalDefinition
import features.goals.GoalPeriod
import java.util.UUID
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.upsert

/**
 * Goals attached to a [Competition]. Every member is evaluated against this same set, and the
 * primary key prevents duplicate (integration, metric, period) entries per competition.
 */
object CompetitionGoals : Table("competition_goals") {
    val competitionID =
        uuid("competition_id").references(Competitions.id, onDelete = ReferenceOption.CASCADE)

    val integration = varchar("integration", 32)
    val metric = varchar("metric", 32)
    val period = enumerationByName("period", 16, GoalPeriod::class)
    val target = long("target")
    val createdAt = long("created_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(competitionID, integration, metric, period)
}

/** A single shared goal in a [Competition]. */
@MappedTable(CompetitionGoals::class)
data class CompetitionGoal(
    val competitionID: UUID,
    override val integration: String,
    override val metric: String,
    override val period: GoalPeriod,
    override val target: Long,
    val createdAt: Long,
) : GoalDefinition

/** Insert or replace a competition goal. Idempotent on (competition, integration, metric, period). */
suspend fun upsertCompetitionGoal(
    competitionID: UUID,
    integration: String,
    metric: String,
    period: GoalPeriod,
    target: Long,
): CompetitionGoal = suspendTransaction {
    val createdAt = System.currentTimeMillis()
    CompetitionGoals.upsert {
        it[CompetitionGoals.competitionID] = competitionID
        it[CompetitionGoals.integration] = integration
        it[CompetitionGoals.metric] = metric
        it[CompetitionGoals.period] = period
        it[CompetitionGoals.target] = target
        it[CompetitionGoals.createdAt] = createdAt
    }
    CompetitionGoal(competitionID, integration, metric, period, target, createdAt)
}

/** All goals in [competitionID], newest first. */
suspend fun goalsForCompetition(competitionID: UUID): List<CompetitionGoal> = suspendTransaction {
    CompetitionGoals.selectAll()
        .where { CompetitionGoals.competitionID eq competitionID }
        .orderBy(CompetitionGoals.createdAt, SortOrder.DESC)
        .map { it.toEntity<CompetitionGoal>() }
}

/** Delete a single competition goal. Returns true if a row was removed. */
suspend fun deleteCompetitionGoal(
    competitionID: UUID,
    integration: String,
    metric: String,
    period: GoalPeriod,
): Boolean = suspendTransaction {
    CompetitionGoals.deleteWhere {
        it.run {
            (CompetitionGoals.competitionID eq competitionID) and
                (CompetitionGoals.integration eq integration) and
                (CompetitionGoals.metric eq metric) and
                (CompetitionGoals.period eq period)
        }
    } > 0
}
