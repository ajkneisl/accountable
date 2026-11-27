package user

import api.Cache
import api.Error
import features.competition.competitionsFor
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.PartData
import io.ktor.http.content.forEachPart
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.receiveMultipart
import io.ktor.server.response.header
import io.ktor.server.response.respond
import io.ktor.server.response.respondBytes
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingCall
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.put
import io.ktor.utils.io.readRemaining
import java.awt.Color
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.UUID
import javax.imageio.IIOImage
import javax.imageio.ImageIO
import javax.imageio.ImageWriteParam
import javax.imageio.stream.MemoryCacheImageOutputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.io.readByteArray
import kotlinx.serialization.Serializable

/** Largest upload accepted, before it's shrunk. */
private const val MAX_UPLOAD_BYTES = 10L * 1024 * 1024

/** Most pixels an upload may decode to, so a small file can't expand into a huge image. */
private const val MAX_PIXELS = 50_000_000L

/** Side of the square every picture is stored at. */
const val AVATAR_SIZE = 384

/** Response to an upload: the new version, for the picture's URL. */
@Serializable data class AvatarResponse(val avatarVersion: Long)

/**
 * [bytes] as the stored picture: the middle square of the image, [AVATAR_SIZE] on a side, as a
 * JPEG. Saving it afresh drops everything but the pixels, metadata such as a photo's location
 * included. A 400 if it isn't a JPEG, PNG, GIF or BMP, or decodes to too many pixels.
 */
fun avatarJpeg(bytes: ByteArray): ByteArray {
    val image = decode(bytes) ?: Error.text("picture must be a JPEG or PNG image")

    val side = minOf(image.width, image.height)
    val square = image.getSubimage((image.width - side) / 2, (image.height - side) / 2, side, side)
    val small = shrink(square, AVATAR_SIZE)

    val out = ByteArrayOutputStream()
    val writer = ImageIO.getImageWritersByFormatName("jpeg").next()
    try {
        MemoryCacheImageOutputStream(out).use { stream ->
            writer.output = stream
            val params =
                writer.defaultWriteParam.apply {
                    compressionMode = ImageWriteParam.MODE_EXPLICIT
                    compressionQuality = 0.85f
                }
            writer.write(null, IIOImage(small, null, null), params)
        }
    } finally {
        writer.dispose()
    }
    return out.toByteArray()
}

/** [bytes] decoded, after checking its size from the header; null if it isn't an image. */
private fun decode(bytes: ByteArray): BufferedImage? {
    ImageIO.createImageInputStream(ByteArrayInputStream(bytes)).use { input ->
        val reader = ImageIO.getImageReaders(input).asSequence().firstOrNull() ?: return null
        try {
            reader.input = input
            val pixels = reader.getWidth(0).toLong() * reader.getHeight(0)
            if (pixels > MAX_PIXELS) Error.text("picture is too large")
            return runCatching { reader.read(0) }.getOrNull()
        } finally {
            reader.dispose()
        }
    }
}

/**
 * [image] scaled to [size] square on an opaque background, halving first while it's more than
 * twice too big: one big bilinear step skips most of the pixels and looks grainy.
 */
private fun shrink(image: BufferedImage, size: Int): BufferedImage {
    var current = image
    var side = image.width
    while (side / 2 >= size) {
        side /= 2
        current = draw(current, side)
    }
    return draw(current, size)
}

private fun draw(image: BufferedImage, size: Int): BufferedImage {
    val out = BufferedImage(size, size, BufferedImage.TYPE_INT_RGB)
    val g = out.createGraphics()
    try {
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
        // A transparent PNG goes onto white rather than JPEG's black.
        g.color = Color.WHITE
        g.fillRect(0, 0, size, size)
        g.drawImage(image, 0, 0, size, size, null)
    } finally {
        g.dispose()
    }
    return out
}

/**
 * The picture in this multipart upload as it's stored: its first file, at most [MAX_UPLOAD_BYTES],
 * through [avatarJpeg]. A 400 if it's too big, absent or not an image.
 */
internal suspend fun RoutingCall.receivePictureJpeg(): ByteArray =
    withContext(Dispatchers.IO) { avatarJpeg(receivePicture()) }

/** The first file in the multipart upload, up to [MAX_UPLOAD_BYTES]; a 400 if too big or absent. */
private suspend fun RoutingCall.receivePicture(): ByteArray {
    var picture: ByteArray? = null
    receiveMultipart(formFieldLimit = MAX_UPLOAD_BYTES + 1).forEachPart { part ->
        if (part is PartData.FileItem && picture == null) {
            val bytes = part.provider().readRemaining(MAX_UPLOAD_BYTES + 1).readByteArray()
            if (bytes.size > MAX_UPLOAD_BYTES) {
                part.dispose()
                Error.text("picture must be at most 10 MB")
            }
            picture = bytes
        }
        part.dispose()
    }
    return picture ?: Error.text("missing picture")
}

/** Every cached view that shows [userID]'s picture. */
private suspend fun invalidateViewsOf(userID: UUID) {
    competitionsFor(userID).forEach { Cache.invalidateCompetition(it.id) }
    Cache.invalidateUser(userID)
}

fun Route.avatarRoutes() {
    authenticate("jwt") {
        // PUT /api/user/avatar: multipart with the picture as its file.
        put("/user/avatar") {
            val userID = call.principal<JWTPrincipal>()!!.subject?.let(UUID::fromString)
                ?: Error.text("invalid token")

            val jpeg = call.receivePictureJpeg()
            val version = System.currentTimeMillis()
            withContext(Dispatchers.IO) { Images.storage.put(ImageKind.AVATAR, userID, jpeg) }
            if (!setAvatarVersion(userID, version)) Error.notFound("user")
            invalidateViewsOf(userID)
            call.respond(AvatarResponse(version))
        }

        delete("/user/avatar") {
            val userID = call.principal<JWTPrincipal>()!!.subject?.let(UUID::fromString)
                ?: Error.text("invalid token")

            if (!setAvatarVersion(userID, null)) Error.notFound("user")
            withContext(Dispatchers.IO) { Images.storage.delete(ImageKind.AVATAR, userID) }
            invalidateViewsOf(userID)
            call.respond(HttpStatusCode.NoContent)
        }
    }

    // GET /api/avatars/{userID}?v={avatarVersion} and /api/images/competitions/{id}?v={version}.
    // Open, so an <Image> can load them without a token; the IDs are only known to those who share
    // a competition. With the version the URL changes on every upload, so it's cached for good.
    get("/avatars/{id}") { call.respondImage(ImageKind.AVATAR) }
    get("/images/competitions/{id}") { call.respondImage(ImageKind.COMPETITION) }
}

/**
 * The stored picture of [kind] for the `id` in the path. A plain 404 if there isn't one, rather
 * than the JSON API's 400: it's an image URL.
 */
private suspend fun RoutingCall.respondImage(kind: ImageKind) {
    val id = parameters["id"]?.let { runCatching { UUID.fromString(it) }.getOrNull() }
    val jpeg = id?.let { withContext(Dispatchers.IO) { Images.storage.get(kind, it) } }
    if (jpeg == null) {
        respond(HttpStatusCode.NotFound)
        return
    }
    val versioned = request.queryParameters["v"] != null
    response.header(
        HttpHeaders.CacheControl,
        if (versioned) "public, max-age=31536000, immutable" else "no-cache",
    )
    respondBytes(jpeg, ContentType.Image.JPEG)
}
