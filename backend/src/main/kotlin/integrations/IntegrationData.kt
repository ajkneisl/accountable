package integrations

import kotlinx.serialization.Serializable

/**
 * Data gained from an integration. Sealed so kotlinx-serialization can write the polymorphic
 * `{"type": "<name>", ...}` discriminator when a value of this type appears in a response.
 */
@Serializable
sealed class IntegrationData {
    /** Start of the UTC day this data covers, in ms epoch. */
    abstract val date: Long
}
