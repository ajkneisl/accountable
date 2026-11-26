package user

import java.io.File
import java.util.UUID
import org.slf4j.LoggerFactory
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.S3Exception

/** Where profile pictures are kept: one JPEG per user, replaced on each upload. */
interface AvatarStorage {
    fun put(userID: UUID, jpeg: ByteArray)

    /** The user's picture, or null if they have none. */
    fun get(userID: UUID): ByteArray?

    /** Remove the user's picture; nothing happens if there isn't one. */
    fun delete(userID: UUID)
}

/** Pictures in an S3 [bucket], for production. Credentials come from the default chain. */
class S3AvatarStorage(private val bucket: String, region: Region) : AvatarStorage {
    private val s3 =
        S3Client.builder().region(region).httpClient(UrlConnectionHttpClient.create()).build()

    private fun key(userID: UUID) = "avatars/$userID.jpg"

    override fun put(userID: UUID, jpeg: ByteArray) {
        s3.putObject(
            { it.bucket(bucket).key(key(userID)).contentType("image/jpeg") },
            RequestBody.fromBytes(jpeg),
        )
    }

    override fun get(userID: UUID): ByteArray? =
        try {
            s3.getObjectAsBytes { it.bucket(bucket).key(key(userID)) }.asByteArray()
        } catch (e: S3Exception) {
            if (e.statusCode() == 404) null else throw e
        }

    override fun delete(userID: UUID) {
        s3.deleteObject { it.bucket(bucket).key(key(userID)) }
    }
}

/** Pictures as files in [dir], for running locally. */
class LocalAvatarStorage(private val dir: File) : AvatarStorage {
    private fun file(userID: UUID) = File(dir, "$userID.jpg")

    override fun put(userID: UUID, jpeg: ByteArray) {
        dir.mkdirs()
        // Written beside the old one and moved over it, so a reader never sees half a picture.
        val temp = File(dir, "$userID.jpg.tmp")
        temp.writeBytes(jpeg)
        if (!temp.renameTo(file(userID))) {
            temp.delete()
            error("couldn't save the picture for $userID")
        }
    }

    override fun get(userID: UUID): ByteArray? = file(userID).takeIf { it.isFile }?.readBytes()

    override fun delete(userID: UUID) {
        file(userID).delete()
    }
}

object Avatars {
    private val log = LoggerFactory.getLogger(Avatars::class.java)

    /**
     * S3 when `AVATAR_BUCKET` names a bucket (in `AWS_REGION`, default us-east-1); otherwise files
     * under `AVATAR_DIR`, by default `data/avatars` in the working directory. Replaced in tests.
     */
    @Volatile var storage: AvatarStorage = defaultStorage()

    private fun defaultStorage(): AvatarStorage {
        val bucket = System.getenv("AVATAR_BUCKET")?.takeIf { it.isNotBlank() }
        if (bucket != null) {
            val region = Region.of(System.getenv("AWS_REGION") ?: "us-east-1")
            log.info("Profile pictures in S3 bucket {} ({})", bucket, region)
            return S3AvatarStorage(bucket, region)
        }
        val dir = File(System.getenv("AVATAR_DIR") ?: "data/avatars")
        log.info("Profile pictures in {}", dir.absolutePath)
        return LocalAvatarStorage(dir)
    }
}
