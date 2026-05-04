package com.accountable.db

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import kotlinx.serialization.json.Json
import kotlinx.serialization.serializer
import org.jetbrains.exposed.sql.Column
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.concurrent.ConcurrentHashMap
import kotlin.reflect.KClass
import kotlin.reflect.KFunction
import kotlin.reflect.KParameter
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.primaryConstructor

/**
 * Initialize the database connection.
 */
fun initDb() {
    val config = HikariConfig().apply {
        jdbcUrl = System.getenv("DATABASE_URL") ?: "jdbc:postgresql://localhost:5432/accountable"
        username = System.getenv("DATABASE_USER") ?: "postgres"
        password = System.getenv("DATABASE_PASSWORD") ?: "postgres"

        driverClassName = "org.postgresql.Driver"
        maximumPoolSize = 10
        isAutoCommit = false
        transactionIsolation = "TRANSACTION_REPEATABLE_READ"

        validate()
    }

    Database.connect(HikariDataSource(config))
    transaction {
        SchemaUtils.create(Users, RefreshTokens)
    }
}

/** Annotate a data class with its corresponding Exposed [Table] for use with [toEntity]. */
@Target(AnnotationTarget.CLASS)
annotation class MappedTable(val table: KClass<out Table>)

/**
 * Cache for tables in [resolveTable].
 */
@PublishedApi
internal val tableAnnotationCache = ConcurrentHashMap<KClass<*>, Table>()

/**
 * Resolve a table using [kClass]. Uses [tableAnnotationCache] as a cache.
 */
@PublishedApi
internal fun resolveTable(kClass: KClass<*>): Table = tableAnnotationCache.getOrPut(kClass) {
    val annotation = kClass.findAnnotation<MappedTable>()
        ?: error("${kClass.simpleName} has no @MappedTable annotation and no table was provided")

    annotation.table.objectInstance ?: error("@MappedTable table for ${kClass.simpleName} must be an object")
}


@PublishedApi
internal data class EntityMapping(
    val params: List<ParamMapping>,
    val constructor: KFunction<Any>,
)

@PublishedApi
internal data class ParamMapping(
    val param: KParameter,
    val column: Column<*>,
    val isJsonCollection: Boolean,
)

@PublishedApi
internal val entityMappingCache = ConcurrentHashMap<Pair<KClass<*>, Table>, EntityMapping>()

@PublishedApi
internal fun buildEntityMapping(kClass: KClass<*>, table: Table): EntityMapping {
    val constructor = kClass.primaryConstructor ?: error("${kClass.simpleName} has no primary constructor")
    val columnsByName = table.columns.associateBy { it.name.snakeToCamel().lowercase() }
    val params = constructor.parameters.mapNotNull { param ->
        val column = columnsByName[param.name!!.lowercase()]
        if (column == null) {
            if (param.isOptional) return@mapNotNull null
            error("No column found for parameter '${param.name}' in table '${table.tableName}'")
        }
        val isJsonCollection = param.type.classifier in listOf(List::class, Set::class, Map::class, HashMap::class)
        ParamMapping(param, column, isJsonCollection)
    }
    return EntityMapping(params, constructor)
}

/**
 * Maps a [ResultRow] into a data class [T] annotated with [MappedTable].
 *
 * Column names are matched to constructor parameters via snake_case → camelCase. Pass [table]
 * explicitly to map from a join or alias.
 */
inline fun <reified T : Any> ResultRow.toEntity(table: Table? = null): T {
    val resolvedTable = table ?: resolveTable(T::class)
    val mapping = entityMappingCache.getOrPut(T::class to resolvedTable) {
        buildEntityMapping(T::class, resolvedTable)
    }
    val args = HashMap<KParameter, Any?>(mapping.params.size)
    for (pm in mapping.params) {
        val value = this[pm.column]
        args[pm.param] = if (pm.isJsonCollection && value is String) {
            Json.decodeFromString(serializer(pm.param.type), value)
        } else {
            value
        }
    }
    @Suppress("UNCHECKED_CAST") return mapping.constructor.callBy(args) as T
}

private fun String.snakeToCamel(): String =
    split("_").mapIndexed { i, s -> if (i == 0) s else s.replaceFirstChar { it.uppercase() } }.joinToString("")
