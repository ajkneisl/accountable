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
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.upsert
import user.Users
import user.zoneOf

/** Apple Workout activity types we recognize. OTHER is the catch-all for anything else. */
@Serializable
enum class WorkoutType {
    RUN,
    WEIGHTLIFTING,
    BASKETBALL,
    PICKLEBALL,
    OTHER,
}

/** Where a workout row came from. APPLE is reserved for the future iOS companion app. */
@Serializable
enum class WorkoutSource {
    MANUAL,
    APPLE,
}

/**
 * One row per workout. Aggregated per day into [AppleFitnessTable] on every write so goal-summing
 * and dashboard reads can use the existing [IntegrationTable] machinery without joining events.
 */
object AppleFitnessWorkouts : Table("apple_fitness_workouts") {
    val id = uuid("id").clientDefault { UUID.randomUUID() }
    val userID = uuid("user_id").references(Users.id, onDelete = ReferenceOption.CASCADE)

    /** Start-of-day in the user's timezone the workout fell in, ms epoch. Indexed for aggregation. */
    val dayStart = long("day_start").index()

    /** When the workout actually occurred, ms epoch. */
    val happenedAt = long("happened_at")

    val type = enumerationByName("type", 24, WorkoutType::class)
    val durationMin = long("duration_min")
    val calories = long("calories")
    val entrySource = enumerationByName("entry_source", 16, WorkoutSource::class)
    val createdAt = long("created_at").clientDefault { System.currentTimeMillis() }

    override val primaryKey = PrimaryKey(id)
}

/** Per-day rollup that [GoalMetric]s sum over. Rebuilt by [AppleFitness.refresh]. */
object AppleFitnessTable : IntegrationTable("integrations_apple_fitness") {
    val calories = long("calories")
    val workouts = long("workouts")
}

/** A single workout as returned to the frontend. */
@Serializable
data class WorkoutResponse(
    val id: String,
    val type: WorkoutType,
    val durationMin: Long,
    val calories: Long,
    val happenedAt: Long,
    val source: WorkoutSource,
)

object AppleFitness : Integration<AppleFitness.AppleFitnessData> {
    override val name = "apple_fitness"

    /** Placeholder externalID. Apple Fitness has no upstream account today, but the
     *  [UserIntegrations] schema requires a non-null value. */
    const val MANUAL_SOURCE = "manual"

    override suspend fun pullData(userID: UUID, date: Long): AppleFitnessData {
        val zone = zoneOf(userID)
        val dayStart = startOfDay(date, zone)
        return suspendTransaction {
            val rows =
                AppleFitnessWorkouts.selectAll()
                    .where {
                        (AppleFitnessWorkouts.userID eq userID) and
                            (AppleFitnessWorkouts.dayStart eq dayStart)
                    }
                    .toList()
            AppleFitnessData(
                date = dayStart,
                calories = rows.sumOf { it[AppleFitnessWorkouts.calories] },
                workouts = rows.size.toLong(),
            )
        }
    }

    override suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<AppleFitnessData> {
        val data = pullData(userID, date)
        val now = System.currentTimeMillis()
        suspendTransaction {
            AppleFitnessTable.upsert {
                it[AppleFitnessTable.userID] = userID
                it[AppleFitnessTable.date] = data.date
                it[AppleFitnessTable.calories] = data.calories
                it[AppleFitnessTable.workouts] = data.workouts
                it[AppleFitnessTable.fetchedAt] = now
            }
        }
        return IntegrationRecord(data, now)
    }

    override suspend fun getDay(userID: UUID, date: Long): IntegrationRecord<AppleFitnessData>? {
        val dayStart = startOfDay(date, zoneOf(userID))
        return suspendTransaction {
            AppleFitnessTable.selectAll()
                .where {
                    (AppleFitnessTable.userID eq userID) and
                        (AppleFitnessTable.date eq dayStart)
                }
                .limit(1)
                .firstOrNull()
                ?.let {
                    IntegrationRecord(
                        data =
                            AppleFitnessData(
                                date = it[AppleFitnessTable.date],
                                calories = it[AppleFitnessTable.calories],
                                workouts = it[AppleFitnessTable.workouts],
                            ),
                        fetchedAt = it[AppleFitnessTable.fetchedAt],
                    )
                }
        }
    }

    @Serializable
    @SerialName("apple_fitness")
    data class AppleFitnessData(
        override val date: Long,
        val calories: Long,
        val workouts: Long,
    ) : IntegrationData()
}

/** Auto-enable Apple Fitness with a placeholder externalID. Idempotent. */
suspend fun ensureAppleFitnessEnabled(userID: UUID) = suspendTransaction {
    UserIntegrations.upsert {
        it[UserIntegrations.userID] = userID
        it[UserIntegrations.integration] = AppleFitness.name
        it[UserIntegrations.externalID] = AppleFitness.MANUAL_SOURCE
    }
}

/**
 * Log a workout for [userID] and refresh the day-rollup so goals and the dashboard see it
 * immediately. Auto-enables the integration on first call.
 */
suspend fun addWorkout(
    userID: UUID,
    type: WorkoutType,
    durationMin: Long,
    calories: Long,
    happenedAt: Long,
    source: WorkoutSource = WorkoutSource.MANUAL,
): WorkoutResponse {
    ensureAppleFitnessEnabled(userID)
    val zone = zoneOf(userID)
    val dayStart = startOfDay(happenedAt, zone)
    val id = UUID.randomUUID()
    suspendTransaction {
        AppleFitnessWorkouts.insert {
            it[AppleFitnessWorkouts.id] = id
            it[AppleFitnessWorkouts.userID] = userID
            it[AppleFitnessWorkouts.dayStart] = dayStart
            it[AppleFitnessWorkouts.happenedAt] = happenedAt
            it[AppleFitnessWorkouts.type] = type
            it[AppleFitnessWorkouts.durationMin] = durationMin
            it[AppleFitnessWorkouts.calories] = calories
            it[AppleFitnessWorkouts.entrySource] = source
        }
    }
    AppleFitness.refresh(userID, dayStart)
    return WorkoutResponse(id.toString(), type, durationMin, calories, happenedAt, source)
}

/** Remove a workout owned by [userID]. Returns true if it existed. */
suspend fun removeWorkout(userID: UUID, workoutID: UUID): Boolean {
    val dayStart: Long? = suspendTransaction {
        val row =
            AppleFitnessWorkouts.selectAll()
                .where {
                    (AppleFitnessWorkouts.id eq workoutID) and
                        (AppleFitnessWorkouts.userID eq userID)
                }
                .limit(1)
                .firstOrNull() ?: return@suspendTransaction null
        val ds = row[AppleFitnessWorkouts.dayStart]
        AppleFitnessWorkouts.deleteWhere {
            it.run {
                (AppleFitnessWorkouts.id eq workoutID) and
                    (AppleFitnessWorkouts.userID eq userID)
            }
        }
        ds
    }
    if (dayStart == null) return false
    AppleFitness.refresh(userID, dayStart)
    return true
}

/** [userID]'s workouts for the local-day containing [date], newest first. */
suspend fun workoutsForDay(userID: UUID, date: Long): List<WorkoutResponse> {
    val dayStart = startOfDay(date, zoneOf(userID))
    return suspendTransaction {
        AppleFitnessWorkouts.selectAll()
            .where {
                (AppleFitnessWorkouts.userID eq userID) and
                    (AppleFitnessWorkouts.dayStart eq dayStart)
            }
            .orderBy(AppleFitnessWorkouts.happenedAt, SortOrder.DESC)
            .map {
                WorkoutResponse(
                    id = it[AppleFitnessWorkouts.id].toString(),
                    type = it[AppleFitnessWorkouts.type],
                    durationMin = it[AppleFitnessWorkouts.durationMin],
                    calories = it[AppleFitnessWorkouts.calories],
                    happenedAt = it[AppleFitnessWorkouts.happenedAt],
                    source = it[AppleFitnessWorkouts.entrySource],
                )
            }
    }
}
