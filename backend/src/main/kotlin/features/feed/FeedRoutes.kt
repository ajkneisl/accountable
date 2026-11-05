package features.feed

import api.Error
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingContext
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.util.logging.KtorSimpleLogger
import java.util.UUID
import notifications.Apns
import notifications.NotificationKind
import notifications.Push
import notifications.devicesFor
import notifications.optOutsFor
import user.findUserByID

private val log = KtorSimpleLogger("FeedRoutes")

private const val DEFAULT_PAGE_SIZE = 30
private const val MAX_PAGE_SIZE = 50

/** GET /api/feed?before={cursor}&limit={n} — the viewer's feed, newest activity first. */
private val FEED_ROUTE: suspend RoutingContext.() -> Unit = {
    val params = call.request.queryParameters
    val before =
        params["before"]?.let { FeedCursor.parse(it) ?: Error.text("invalid cursor") }
    val limit = (params["limit"]?.toIntOrNull() ?: DEFAULT_PAGE_SIZE).coerceIn(1, MAX_PAGE_SIZE)
    call.respond(feedFor(call.userID(), before, limit))
}

/** PUT /api/feed/{id}/like — heart a card. Idempotent. */
private val LIKE_ROUTE: suspend RoutingContext.() -> Unit = {
    val userID = call.userID()
    val result = likePost(userID, call.postID())
    if (result.firstLike) notifyLiked(userID, result)
    call.respond(result.likes)
}

/** DELETE /api/feed/{id}/like — take back a heart. Idempotent. */
private val UNLIKE_ROUTE: suspend RoutingContext.() -> Unit = {
    call.respond(unlikePost(call.userID(), call.postID()))
}

/** Tell the card's owner, unless they've opted out. A failed push doesn't fail the like. */
private suspend fun notifyLiked(likerID: UUID, like: LikeResult) {
    runCatching {
            if (NotificationKind.FEED_LIKES in optOutsFor(like.actorID)) return
            val liker = findUserByID(likerID)?.username ?: return
            Apns.send(
                devicesFor(like.actorID),
                Push(
                    title = "$liker liked your update",
                    body = like.detail.summary().replaceFirstChar { it.uppercase() },
                    // No path, so a tap just opens the app. Home was renamed in 1.2.0, so
                    // naming it would strand older versions on the router's error page.
                    thread = "feed-likes",
                ),
            )
        }
        .onFailure { log.warn("like notification failed: user=${like.actorID}", it) }
}

private fun ApplicationCall.userID(): UUID =
    principal<JWTPrincipal>()!!.subject?.let(UUID::fromString) ?: Error.text("invalid token")

private fun ApplicationCall.postID(): UUID =
    parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
        ?: throw Error("That post does not exist.", 404)

fun Route.feedRoutes() {
    authenticate("jwt") {
        route("/feed") {
            get("", FEED_ROUTE)
            put("/{id}/like", LIKE_ROUTE)
            delete("/{id}/like", UNLIKE_ROUTE)
        }
    }
}
