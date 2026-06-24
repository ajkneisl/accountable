plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
    alias(ktorLibs.plugins.ktor)
}

group = "com.accountable"
version = "1.0.0-SNAPSHOT"

application {
    mainClass = "ApplicationKt"
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    implementation(ktorLibs.server.core)
    implementation(ktorLibs.server.netty)
    implementation(ktorLibs.server.contentNegotiation)
    implementation(ktorLibs.server.defaultHeaders)
    implementation(ktorLibs.server.doubleReceive)
    implementation(ktorLibs.server.statusPages)
    implementation(ktorLibs.server.callLogging)
    implementation(ktorLibs.server.cors)
    implementation(ktorLibs.server.compression)
    implementation(ktorLibs.server.auth)
    implementation(ktorLibs.server.auth.jwt)
    implementation(ktorLibs.server.requestValidation)
    implementation(ktorLibs.serialization.kotlinx.json)

    implementation(libs.exposed.core)
    implementation(libs.exposed.jdbc)
    implementation(libs.exposed.dao)
    implementation(libs.exposed.java.time)
    implementation(libs.exposed.json)
    implementation(libs.postgresql)
    implementation(libs.hikaricp)

    implementation(libs.khealth)
    implementation(libs.bcrypt)
    implementation(libs.jedis)

    implementation(kotlin("reflect"))

    implementation(libs.logback.classic)

    implementation(ktorLibs.client.core)
    implementation(ktorLibs.client.cio)
    implementation(ktorLibs.client.contentNegotiation)

    testImplementation(kotlin("test"))
    testImplementation(ktorLibs.server.testHost)
    testImplementation(ktorLibs.client.contentNegotiation)
    testImplementation(ktorLibs.client.mock)
    testImplementation(libs.h2)
}

// Forward REDIS_URL into tests so the live CacheTest can run against a real Redis when one is
// provided; when unset, the cache (and CacheTest) self-disable, so the suite needs no Redis.
tasks.test {
    System.getenv("REDIS_URL")?.let { environment("REDIS_URL", it) }
}
