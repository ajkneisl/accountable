package com.accountable

import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import io.ktor.server.testing.testApplication
import rootModule
import kotlin.test.*

class ServerTest {

    @Test
    fun `test root endpoint`() = testApplication {
        application {
            rootModule()
        }
        // verify the server is up; the SPA root needs a frontend build, so hit the API instead
        assertEquals(HttpStatusCode.OK, client.get("/api/version").status)
    }

}
