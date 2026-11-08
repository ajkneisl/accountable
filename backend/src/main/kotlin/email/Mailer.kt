package email

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.slf4j.LoggerFactory
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.sesv2.SesV2Client
import software.amazon.awssdk.services.sesv2.model.Body
import software.amazon.awssdk.services.sesv2.model.Content
import software.amazon.awssdk.services.sesv2.model.Destination
import software.amazon.awssdk.services.sesv2.model.EmailContent
import software.amazon.awssdk.services.sesv2.model.Message
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest

/** One outgoing email, with a plain-text body and an optional HTML one. */
data class Email(val to: String, val subject: String, val text: String, val html: String? = null)

/** Sends [Email]s. */
fun interface Mailer {
    fun send(email: Email)
}

/** Sends through Amazon SES, as [from] (an address on a verified SES identity). */
class SesMailer(private val from: String, region: Region) : Mailer {
    private val client =
        SesV2Client.builder()
            .region(region)
            .httpClient(UrlConnectionHttpClient.create())
            .build()

    override fun send(email: Email) {
        val body = Body.builder().text(content(email.text))
        if (email.html != null) body.html(content(email.html))
        client.sendEmail(
            SendEmailRequest.builder()
                .fromEmailAddress(from)
                .destination(Destination.builder().toAddresses(email.to).build())
                .content(
                    EmailContent.builder()
                        .simple(
                            Message.builder().subject(content(email.subject)).body(body.build()).build()
                        )
                        .build()
                )
                .build()
        )
    }

    private fun content(data: String) = Content.builder().data(data).charset("UTF-8").build()
}

/** Logs emails instead of sending them, for local development. */
object LogMailer : Mailer {
    private val log = LoggerFactory.getLogger(LogMailer::class.java)

    override fun send(email: Email) {
        log.info("Email to {} — {}\n{}", email.to, email.subject, email.text)
    }
}

/**
 * The app's [Mailer]. SES when running on ECS (which provides task-role credentials) or when
 * `EMAIL_TRANSPORT=ses`; otherwise emails are only logged, so local runs never send mail.
 * Sends happen off the request, so a slow or failing send can't hold up (or reveal anything
 * through) the response.
 */
object Mail {
    private val log = LoggerFactory.getLogger(Mail::class.java)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /** Replaced in tests. */
    @Volatile
    var mailer: Mailer = defaultMailer()

    private fun defaultMailer(): Mailer {
        val ses =
            System.getenv("EMAIL_TRANSPORT") == "ses" ||
                (System.getenv("EMAIL_TRANSPORT") == null &&
                    System.getenv("AWS_CONTAINER_CREDENTIALS_RELATIVE_URI") != null)
        if (!ses) return LogMailer
        val from = System.getenv("EMAIL_FROM") ?: "Beacc <no-reply@beacc.app>"
        val region = Region.of(System.getenv("AWS_REGION") ?: "us-east-1")
        return SesMailer(from, region)
    }

    /** Send [email] in the background, logging (not throwing) a failure. */
    fun sendLater(email: Email) {
        val mailer = mailer
        scope.launch {
            runCatching { mailer.send(email) }
                .onFailure { log.error("Couldn't send \"{}\" to {}", email.subject, email.to, it) }
        }
    }
}
