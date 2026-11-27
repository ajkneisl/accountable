package user

import java.io.File
import java.util.UUID
import org.slf4j.LoggerFactory
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.S3Exception

/** What a stored picture is of; each kind has its own folder. */
enum class ImageKind(val folder: String) {
    /** A user's profile picture, by user ID. */
    AVATAR("avatars"),

    /** A competition's picture, by competition ID. */
    COMPETITION("competitions"),

    /** A copy of a reported profile picture, by report ID; never served. */
    REPORT("reports"),
}

/** Where pictures are kept: one JPEG per user or competition, replaced on each upload. */
interface ImageStorage {
    fun put(kind: ImageKind, id: UUID, jpeg: ByteArray)

    /** The picture, or null if there isn't one. */
    fun get(kind: ImageKind, id: UUID): ByteArray?

    /** Remove the picture; nothing happens if there isn't one. */
    fun delete(kind: ImageKind, id: UUID)
}

/** Pictures in an S3 [bucket], for production. Credentials come from the default chain. */
class S3ImageStorage(private val bucket: String, region: Region) : ImageStorage {
    private val s3 =
        S3Client.builder().region(region).httpClient(UrlConnectionHttpClient.create()).build()

    private fun key(kind: ImageKind, id: UUID) = "${kind.folder}/$id.jpg"

    override fun put(kind: ImageKind, id: UUID, jpeg: ByteArray) {
        s3.putObject(
            { it.bucket(bucket).key(key(kind, id)).contentType("image/jpeg") },
            RequestBody.fromBytes(jpeg),
        )
    }

    override fun get(kind: ImageKind, id: UUID): ByteArray? =
        try {
            s3.getObjectAsBytes { it.bucket(bucket).key(key(kind, id)) }.asByteArray()
        } catch (e: S3Exception) {
            if (e.statusCode() == 404) null else throw e
        }

    override fun delete(kind: ImageKind, id: UUID) {
        s3.deleteObject { it.bucket(bucket).key(key(kind, id)) }
    }
}

/** Pictures as files under [dir], one folder per kind, for running locally. */
class LocalImageStorage(private val dir: File) : ImageStorage {
    private fun file(kind: ImageKind, id: UUID) = File(File(dir, kind.folder), "$id.jpg")

    override fun put(kind: ImageKind, id: UUID, jpeg: ByteArray) {
        val target = file(kind, id)
        target.parentFile.mkdirs()
        // Written beside the old one and moved over it, so a reader never sees half a picture.
        val temp = File(target.parentFile, "$id.jpg.tmp")
        temp.writeBytes(jpeg)
        if (!temp.renameTo(target)) {
            temp.delete()
            error("couldn't save the ${kind.name.lowercase()} picture for $id")
        }
    }

    override fun get(kind: ImageKind, id: UUID): ByteArray? =
        file(kind, id).takeIf { it.isFile }?.readBytes()

    override fun delete(kind: ImageKind, id: UUID) {
        file(kind, id).delete()
    }
}

object Images {
    private val log = LoggerFactory.getLogger(Images::class.java)

    /**
     * S3 when `AVATAR_BUCKET` names a bucket (in `AWS_REGION`, default us-east-1); otherwise files
     * under `IMAGE_DIR`, by default `data` in the working directory. Replaced in tests.
     */
    @Volatile var storage: ImageStorage = defaultStorage()

    private fun defaultStorage(): ImageStorage {
        val bucket = System.getenv("AVATAR_BUCKET")?.takeIf { it.isNotBlank() }
        if (bucket != null) {
            val region = Region.of(System.getenv("AWS_REGION") ?: "us-east-1")
            log.info("Pictures in S3 bucket {} ({})", bucket, region)
            return S3ImageStorage(bucket, region)
        }
        val dir = File(System.getenv("IMAGE_DIR") ?: "data")
        log.info("Pictures in {}", dir.absolutePath)
        return LocalImageStorage(dir)
    }
}
