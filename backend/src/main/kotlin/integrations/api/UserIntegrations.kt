package integrations.api

import api.suspendTransaction
import java.util.UUID
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.upsert
import user.Users

/**
 * Which integrations each user has enabled, plus the upstream account identifier for each.
 * One row per (user, integration); a user can have at most one connected account per provider.
 */
object UserIntegrations : Table("user_integrations") {
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)

    /** Matches [Integration.name] — e.g. `"github"`, `"leetcode"`. */
    val integration = varchar("integration", 32)

    /** Provider-side account identifier (e.g. GitHub username, LeetCode username). */
    val externalID = varchar("external_id", 128)

    override val primaryKey = PrimaryKey(userID, integration)
}

/** Enable [integration] for [userID] with the given upstream [externalID], or update the ID. */
suspend fun enableIntegration(userID: UUID, integration: String, externalID: String) =
    suspendTransaction {
        UserIntegrations.upsert {
            it[UserIntegrations.userID] = userID
            it[UserIntegrations.integration] = integration
            it[UserIntegrations.externalID] = externalID
        }
    }

/** Disable [integration] for [userID]. Does not touch the per-integration data tables. */
suspend fun disableIntegration(userID: UUID, integration: String) = suspendTransaction {
    UserIntegrations.deleteWhere {
        it.run {
            (UserIntegrations.userID eq userID) and
                (UserIntegrations.integration eq integration)
        }
    }
}

/** Names of every integration [userID] has enabled. */
suspend fun integrationsFor(userID: UUID): List<String> = suspendTransaction {
    UserIntegrations.selectAll()
        .where { UserIntegrations.userID eq userID }
        .map { it[UserIntegrations.integration] }
}

/**
 * Look up the upstream account identifier for [userID] on [integration].
 * @throws IllegalStateException if the user has not enabled this integration.
 */
suspend fun externalIDFor(userID: UUID, integration: String): String =
    suspendTransaction {
        UserIntegrations.select(UserIntegrations.externalID)
            .where {
                (UserIntegrations.userID eq userID) and
                    (UserIntegrations.integration eq integration)
            }
            .limit(1)
            .firstOrNull()
            ?.get(UserIntegrations.externalID)
    } ?: error("user $userID has not enabled integration '$integration'")
