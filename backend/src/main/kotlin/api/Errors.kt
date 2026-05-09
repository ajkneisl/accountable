package api

import kotlinx.serialization.Serializable

/**
 * An error that's responded to the user.
 *
 * @param message The body of the error.
 * @param statusCode The status code of the error.
 */
data class Error(override val message: String, val statusCode: Int) : Throwable() {
    @Serializable data class ErrorBody(val message: String)

    companion object {
        fun text(message: String): Nothing {
            throw Error(message, 400)
        }

        fun notFound(item: String): Nothing {
            throw Error("That $item does not exist.", 400)
        }
    }
}

/**
 * Multiple errors that's responded to the user.
 *
 * @param messages The messages of the error.
 * @param statusCode The status code of the error.
 */
data class MultiError(val messages: List<String>, val statusCode: Int) : Throwable() {
    @Serializable data class MultiErrorBody(val messages: List<String>)

    companion object {
        fun texts(messages: List<String>): Nothing {
            throw MultiError(messages, 400)
        }
    }
}
