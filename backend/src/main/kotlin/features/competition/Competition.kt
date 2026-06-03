package features.competition

import api.MappedTable
import api.suspendTransaction
import api.toEntity
import java.util.UUID
import kotlin.random.Random
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.innerJoin
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import user.Users

private const val JOIN_CODE_LENGTH = 6
private const val JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
private const val JOIN_CODE_RETRY_LIMIT = 16

/** Table that contains [Competition]. */
object Competitions : Table("competitions") {
    val id = uuid("id").clientDefault { UUID.randomUUID() }
    val name = varchar("name", 64)
    val ownerID = uuid("owner_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val joinCode = varchar("join_code", 8).uniqueIndex()
    val createdAt = long("created_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(id)
}

/**
 * A multi-user competition that shares a goal set across all members.
 *
 * @param id Unique ID.
 * @param name Display name set by the owner.
 * @param ownerID The user who created the competition; they alone can edit goals and delete it.
 * @param joinCode Short alphanumeric code anyone can present to join.
 * @param createdAt Ms epoch when the competition was created.
 */
@MappedTable(Competitions::class)
data class Competition(
    val id: UUID,
    val name: String,
    val ownerID: UUID,
    val joinCode: String,
    val createdAt: Long,
)

/** Membership join table. One row per (competition, user) with the user's join timestamp. */
object CompetitionMembers : Table("competition_members") {
    val competitionID =
        uuid("competition_id").references(Competitions.id, onDelete = ReferenceOption.CASCADE)
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)
    val joinedAt = long("joined_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(competitionID, userID)
}

/** One member of a competition. */
data class CompetitionMember(val userID: UUID, val joinedAt: Long)

/**
 * Create a competition owned by [ownerID]. The owner is added as the first member. A unique
 * [Competition.joinCode] is generated; collision-retry is bounded by [JOIN_CODE_RETRY_LIMIT].
 */
suspend fun createCompetition(ownerID: UUID, name: String): Competition = suspendTransaction {
    val id = UUID.randomUUID()
    val createdAt = System.currentTimeMillis()
    val joinCode = generateUniqueJoinCode()
    Competitions.insert {
        it[Competitions.id] = id
        it[Competitions.name] = name
        it[Competitions.ownerID] = ownerID
        it[Competitions.joinCode] = joinCode
        it[Competitions.createdAt] = createdAt
    }
    CompetitionMembers.insert {
        it[CompetitionMembers.competitionID] = id
        it[CompetitionMembers.userID] = ownerID
        it[CompetitionMembers.joinedAt] = createdAt
    }
    Competition(id, name, ownerID, joinCode, createdAt)
}

private fun generateUniqueJoinCode(): String {
    repeat(JOIN_CODE_RETRY_LIMIT) {
        val candidate = randomJoinCode()
        val taken =
            Competitions.selectAll()
                .where { Competitions.joinCode eq candidate }
                .limit(1)
                .empty()
                .not()
        if (!taken) return candidate
    }
    error("could not allocate a unique join code after $JOIN_CODE_RETRY_LIMIT attempts")
}

private fun randomJoinCode(): String =
    buildString(JOIN_CODE_LENGTH) {
        repeat(JOIN_CODE_LENGTH) { append(JOIN_CODE_ALPHABET[Random.nextInt(JOIN_CODE_ALPHABET.length)]) }
    }

/** Find a competition by [id], or null. */
suspend fun findCompetitionByID(id: UUID): Competition? = suspendTransaction {
    Competitions.selectAll().where { Competitions.id eq id }.limit(1).firstOrNull()?.toEntity()
}

/** Find a competition by [joinCode], or null. */
suspend fun findCompetitionByJoinCode(joinCode: String): Competition? = suspendTransaction {
    Competitions.selectAll()
        .where { Competitions.joinCode eq joinCode }
        .limit(1)
        .firstOrNull()
        ?.toEntity()
}

/** Every competition [userID] is a member of, most recently joined first. */
suspend fun competitionsFor(userID: UUID): List<Competition> = suspendTransaction {
    Competitions.innerJoin(
            CompetitionMembers,
            { Competitions.id },
            { CompetitionMembers.competitionID },
        )
        .selectAll()
        .where { CompetitionMembers.userID eq userID }
        .orderBy(CompetitionMembers.joinedAt, SortOrder.DESC)
        .map { it.toEntity<Competition>(Competitions) }
}

/** True iff [userID] is currently a member of [competitionID]. */
suspend fun isMember(userID: UUID, competitionID: UUID): Boolean = suspendTransaction {
    CompetitionMembers.selectAll()
        .where {
            (CompetitionMembers.competitionID eq competitionID) and
                (CompetitionMembers.userID eq userID)
        }
        .limit(1)
        .empty()
        .not()
}

/** All members of [competitionID] with their join timestamps. */
suspend fun membersOf(competitionID: UUID): List<CompetitionMember> = suspendTransaction {
    CompetitionMembers.selectAll()
        .where { CompetitionMembers.competitionID eq competitionID }
        .orderBy(CompetitionMembers.joinedAt, SortOrder.ASC)
        .map {
            CompetitionMember(
                userID = it[CompetitionMembers.userID],
                joinedAt = it[CompetitionMembers.joinedAt],
            )
        }
}

/** Add [userID] to [competitionID]. Idempotent — re-joining keeps the original join timestamp. */
suspend fun joinCompetition(userID: UUID, competitionID: UUID) = suspendTransaction {
    val already =
        CompetitionMembers.selectAll()
            .where {
                (CompetitionMembers.competitionID eq competitionID) and
                    (CompetitionMembers.userID eq userID)
            }
            .limit(1)
            .empty()
            .not()
    if (!already) {
        CompetitionMembers.insert {
            it[CompetitionMembers.competitionID] = competitionID
            it[CompetitionMembers.userID] = userID
            it[CompetitionMembers.joinedAt] = System.currentTimeMillis()
        }
    }
}

/** Remove [userID] from [competitionID]. Returns true if a row was removed. */
suspend fun leaveCompetition(userID: UUID, competitionID: UUID): Boolean = suspendTransaction {
    CompetitionMembers.deleteWhere {
        it.run {
            (CompetitionMembers.competitionID eq competitionID) and
                (CompetitionMembers.userID eq userID)
        }
    } > 0
}

/** Delete a competition. Cascades to members and goals. Returns true if a row was removed. */
suspend fun deleteCompetition(competitionID: UUID): Boolean = suspendTransaction {
    Competitions.deleteWhere { it.run { Competitions.id eq competitionID } } > 0
}
