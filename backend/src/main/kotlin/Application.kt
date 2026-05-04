package com.accountable

import dev.hayden.KHealth
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.compression.Compression
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.plugins.defaultheaders.DefaultHeaders
import io.ktor.server.plugins.doublereceive.DoubleReceive
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private const val APP_VERSION = "1.0.0-SNAPSHOT"

@Serializable
data class VersionResponse(val version: String, val name: String)

fun main() {
    embeddedServer(
        factory = Netty,
        port = 8080,
        host = "0.0.0.0",
        module = Application::rootModule,
    ).start(wait = true)
}

fun Application.rootModule() {
    install(DefaultHeaders)
    install(CallLogging)
    install(Compression)
    install(DoubleReceive)
    install(CORS) {
        anyHost()
        allowHeaders { true }
        allowCredentials = true
    }
    install(ContentNegotiation) {
        json(
            Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
                encodeDefaults = true
            },
        )
    }
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            call.respondText(
                text = cause.message ?: "Internal Server Error",
                status = HttpStatusCode.InternalServerError,
            )
        }
    }
    install(KHealth)

    routing {
        get("/") {
            call.respondText("Hello, World!")
        }
        get("/version") {
            call.respond(VersionResponse(version = APP_VERSION, name = "accountable"))
        }
    }
}
