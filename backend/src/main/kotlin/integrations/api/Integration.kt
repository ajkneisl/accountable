package integrations.api

import integrations.IntegrationData
import java.util.UUID

/**
 * A read-only adapter over an upstream provider, like GitHub. Implementations are responsible
 * for both fetching from upstream and persisting per-day rows in their own [IntegrationTable].
 */
interface Integration<T : IntegrationData> {
    /** Stable provider identifier used in logs, config, and the polymorphic JSON discriminator. */
    val name: String

    /**
     * Fetch fresh data from the upstream provider for the calendar day (in [userID]'s timezone)
     * containing [date], using the external account linked in [UserIntegrations] for [userID].
     * Does not persist.
     */
    suspend fun pullData(userID: UUID, date: Long): T

    /**
     * [pullData] + upsert into the integration's table. Returns the freshly written record with
     * its `fetchedAt` timestamp.
     */
    suspend fun refresh(userID: UUID, date: Long): IntegrationRecord<T>

    /** Read a single day's stored row, including when it was last fetched. */
    suspend fun getDay(userID: UUID, date: Long): IntegrationRecord<T>?
}

/**
 * One persisted day of integration data plus its row metadata.
 *
 * @property data The provider-specific payload.
 * @property fetchedAt When [data] was last refreshed from the upstream provider.
 */
data class IntegrationRecord<T : IntegrationData>(val data: T, val fetchedAt: Long)
