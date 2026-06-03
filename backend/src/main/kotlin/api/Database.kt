package api

import features.competition.CompetitionGoals
import features.competition.CompetitionMembers
import features.competition.Competitions
import features.goals.Goals
import integrations.api.IntegrationTables
import integrations.api.UserIntegrations
import user.RefreshTokens
import user.Users
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.util.concurrent.ConcurrentHashMap
import kotlin.reflect.KClass
import kotlin.reflect.KFunction
import kotlin.reflect.KParameter
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.primaryConstructor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.serializer
import org.jetbrains.exposed.sql.Column
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.Transaction
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * Initialize the connection pool and create any missing schema.
 *
 * Reads `DATABASE_URL`, `DATABASE_USER`, and `DATABASE_PASSWORD` from the environment, falling back
 * to a local Postgres for development. Must be called once at application startup before any
 * [transaction] or [suspendTransaction] block.
 */
fun initDb() {
    val config =
        HikariConfig().apply {
            jdbcUrl =
                System.getenv("DATABASE_URL") ?: "jdbc:postgresql://localhost:5432/accountable"
            username = System.getenv("DATABASE_USER") ?: "postgres"
            password = System.getenv("DATABASE_PASSWORD") ?: "postgres"

            println(jdbcUrl)

            driverClassName = "org.postgresql.Driver"
            maximumPoolSize = 10
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_REPEATABLE_READ"

            validate()
        }

    Database.connect(HikariDataSource(config))
    transaction {
        SchemaUtils.create(
            Users,
            RefreshTokens,
            UserIntegrations,
            Goals,
            Competitions,
            CompetitionMembers,
            CompetitionGoals,
            *IntegrationTables.all.toTypedArray(),
        )
    }
}

/** Run an Exposed [transaction] from a coroutine without blocking the calling dispatcher. */
suspend fun <T> suspendTransaction(block: Transaction.() -> T): T =
    withContext(Dispatchers.IO) { transaction(statement = block) }

/**
 * Marks a data class as the row-shape of an Exposed [Table] for use with [toEntity].
 *
 * The referenced [table] must be a singleton `object`, since [toEntity] retrieves it via
 * `KClass.objectInstance`.
 *
 * @property table The Exposed [Table] this data class maps to.
 */
@Target(AnnotationTarget.CLASS) annotation class MappedTable(val table: KClass<out Table>)

/** Cache of resolved tables keyed by entity class, populated lazily by [resolveTable]. */
@PublishedApi internal val tableAnnotationCache = ConcurrentHashMap<KClass<*>, Table>()

/**
 * Resolve the [Table] for an entity class via its [MappedTable] annotation, caching the result.
 *
 * @throws IllegalStateException if [kClass] has no [MappedTable] or the referenced table is not an
 *   `object`.
 */
@PublishedApi
internal fun resolveTable(kClass: KClass<*>): Table =
    tableAnnotationCache.getOrPut(kClass) {
        val annotation =
            kClass.findAnnotation<MappedTable>()
                ?: error(
                    "${kClass.simpleName} has no @MappedTable annotation and no table was provided"
                )

        annotation.table.objectInstance
            ?: error("@MappedTable table for ${kClass.simpleName} must be an object")
    }

/**
 * Pre-computed plan for materializing an entity from a [ResultRow].
 *
 * @property params Per-parameter mapping with the resolved column and whether it must be
 *   JSON-decoded.
 * @property constructor The primary constructor invoked via [KFunction.callBy].
 */
@PublishedApi
internal data class EntityMapping(val params: List<ParamMapping>, val constructor: KFunction<Any>)

/**
 * One constructor parameter resolved against an Exposed [Column].
 *
 * @property param The constructor parameter that will receive the column value.
 * @property column The [Column] holding the source value in the [ResultRow].
 * @property isJsonCollection True for `List` / `Set` / `Map` parameters whose stored value is a
 *   JSON string and must be decoded before being passed to the constructor.
 */
@PublishedApi
internal data class ParamMapping(
    val param: KParameter,
    val column: Column<*>,
    val isJsonCollection: Boolean,
)

/** Cache of [EntityMapping]s keyed by `(entity class, table)` so reflection runs once per pair. */
@PublishedApi
internal val entityMappingCache = ConcurrentHashMap<Pair<KClass<*>, Table>, EntityMapping>()

/**
 * Build the [EntityMapping] for [kClass] against [table] by walking the primary constructor and
 * matching each parameter to a column whose snake_case name matches the parameter name.
 *
 * @throws IllegalStateException if [kClass] has no primary constructor or a required parameter has
 *   no matching column.
 */
@PublishedApi
internal fun buildEntityMapping(kClass: KClass<*>, table: Table): EntityMapping {
    val constructor =
        kClass.primaryConstructor ?: error("${kClass.simpleName} has no primary constructor")
    val columnsByName = table.columns.associateBy { it.name.snakeToCamel().lowercase() }
    val params =
        constructor.parameters.mapNotNull { param ->
            val column = columnsByName[param.name!!.lowercase()]
            if (column == null) {
                if (param.isOptional) return@mapNotNull null
                error("No column found for parameter '${param.name}' in table '${table.tableName}'")
            }
            val isJsonCollection =
                param.type.classifier in listOf(List::class, Set::class, Map::class, HashMap::class)
            ParamMapping(param, column, isJsonCollection)
        }
    return EntityMapping(params, constructor)
}

/**
 * Maps a [ResultRow] into a data class [T] annotated with [MappedTable].
 *
 * Column names are matched to constructor parameters via snake_case → camelCase. Pass [table]
 * explicitly to map from a join or alias.
 *
 * @param table Override the table resolved from [T]'s [MappedTable] annotation. Useful when reading
 *   from a join or aliased table whose columns are otherwise unreachable.
 * @return A populated instance of [T].
 */
inline fun <reified T : Any> ResultRow.toEntity(table: Table? = null): T {
    val resolvedTable = table ?: resolveTable(T::class)
    val mapping =
        entityMappingCache.getOrPut(T::class to resolvedTable) {
            buildEntityMapping(T::class, resolvedTable)
        }
    val args = HashMap<KParameter, Any?>(mapping.params.size)
    for (pm in mapping.params) {
        val value = this[pm.column]
        args[pm.param] =
            if (pm.isJsonCollection && value is String) {
                Json.decodeFromString(serializer(pm.param.type), value)
            } else {
                value
            }
    }
    @Suppress("UNCHECKED_CAST")
    return mapping.constructor.callBy(args) as T
}

/**
 * Convert a `snake_case` identifier to `camelCase` for matching against constructor parameter
 * names.
 */
private fun String.snakeToCamel(): String =
    split("_")
        .mapIndexed { i, s -> if (i == 0) s else s.replaceFirstChar { it.uppercase() } }
        .joinToString("")
