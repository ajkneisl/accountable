import api.Error
import api.MultiError
import api.initDb
import auth.JwtConfig
import auth.authRoutes
import dev.hayden.KHealth
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.jwt.jwt
import io.ktor.server.engine.embeddedServer
import io.ktor.server.http.content.react
import io.ktor.server.http.content.singlePageApplication
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.compression.Compression
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.plugins.defaultheaders.DefaultHeaders
import io.ktor.server.plugins.doublereceive.DoubleReceive
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import kotlinx.serialization.json.Json
import user.userRoutes

private const val APP_VERSION = "1.0.0-SNAPSHOT"

fun main() {
    embeddedServer(factory = Netty, port = 8080, host = "0.0.0.0", module = Application::rootModule)
        .start(wait = true)
}

fun Application.rootModule() {
    initDb()
    configureModule()
}

fun Application.configureModule() {
    install(DefaultHeaders)
    install(CallLogging)
    install(Compression)
    install(DoubleReceive)
    install(CORS) {
        anyHost()
        anyMethod()
        allowHeaders { true }
        allowNonSimpleContentTypes = true
    }

    install(ContentNegotiation) {
        json(
            Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
                encodeDefaults = true
            }
        )
    }

    install(Authentication) {
        jwt("jwt") {
            realm = JwtConfig.REALM
            verifier(JwtConfig.verifier)
            validate { credential ->
                if (credential.payload.subject.isNullOrBlank()) null
                else JWTPrincipal(credential.payload)
            }
        }
    }

    install(StatusPages) {
        exception<Error> { call, cause ->
            call.respond(HttpStatusCode.fromValue(cause.statusCode), Error.ErrorBody(cause.message))
        }

        exception<MultiError> { call, cause ->
            call.respond(
                HttpStatusCode.fromValue(cause.statusCode),
                MultiError.MultiErrorBody(cause.messages),
            )
        }

        exception<Throwable> { call, cause ->
            call.respond(
                HttpStatusCode.InternalServerError,
                Error.ErrorBody(cause.message ?: "Internal Server Error"),
            )
        }
    }

    install(KHealth)

    routing {
        get("/") { singlePageApplication { react("dist") } }

        route("/api") {
            get("/version") { call.respond("accountable") }

            authRoutes()
            userRoutes()
        }
    }
}
