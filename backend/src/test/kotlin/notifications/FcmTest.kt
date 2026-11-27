package com.accountable.notifications

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import notifications.FcmOutcome
import notifications.Push
import notifications.PushPlatform
import notifications.fcmOutcome
import notifications.fcmPayload
import notifications.normalizeToken

/** FCM's message shape, how its replies are read, and which tokens each platform accepts. */
class FcmTest {
    // The shape of a real FCM registration token: mixed case, a colon, dashes and underscores.
    private val fcmToken =
        "cZx9Q-abcDEF_123:APA91bH" + "kLmNoPqRsTuVwXyZ0123456789abcdefGHIJKLmnopQRstuvWXyz_-".repeat(2)

    @Test
    fun `payload carries the text, the route and the Android options`() {
        val json =
            Json.parseToJsonElement(
                    fcmPayload(fcmToken, Push("Title", "Body", path = "/competition/1", thread = "t1"))
                )
                .jsonObject
                .getValue("message")
                .jsonObject
        assertEquals(fcmToken, json.getValue("token").jsonPrimitive.content)
        val notification = json.getValue("notification").jsonObject
        assertEquals("Title", notification.getValue("title").jsonPrimitive.content)
        assertEquals("Body", notification.getValue("body").jsonPrimitive.content)
        val data = json.getValue("data").jsonObject
        assertEquals("/competition/1", data.getValue("path").jsonPrimitive.content)
        // FCM data values must be strings, so the nested body is JSON text.
        val body = Json.parseToJsonElement(data.getValue("body").jsonPrimitive.content).jsonObject
        assertEquals("/competition/1", body.getValue("path").jsonPrimitive.content)
        val android = json.getValue("android").jsonObject
        assertEquals("HIGH", android.getValue("priority").jsonPrimitive.content)
        assertEquals("10800s", android.getValue("ttl").jsonPrimitive.content)
        val androidNotification = android.getValue("notification").jsonObject
        assertEquals("default", androidNotification.getValue("channel_id").jsonPrimitive.content)
        assertEquals("t1", androidNotification.getValue("tag").jsonPrimitive.content)
    }

    @Test
    fun `payload without a route has no data`() {
        val message =
            Json.parseToJsonElement(fcmPayload(fcmToken, Push("T", "B"))).jsonObject.getValue("message").jsonObject
        assertFalse("data" in message)
    }

    @Test
    fun `replies are read as sent, gone or failed`() {
        assertEquals(FcmOutcome.SENT, fcmOutcome(200, """{"name":"projects/p/messages/1"}"""))
        assertEquals(FcmOutcome.GONE, fcmOutcome(404, """{"error":{"status":"NOT_FOUND"}}"""))
        assertEquals(
            FcmOutcome.GONE,
            fcmOutcome(
                400,
                """{"error":{"status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.firebase.fcm.v1.FcmError","errorCode":"UNREGISTERED"}]}}""",
            ),
        )
        assertEquals(
            FcmOutcome.GONE,
            fcmOutcome(
                400,
                """{"error":{"status":"INVALID_ARGUMENT","message":"The registration token is not a valid FCM registration token"}}""",
            ),
        )
        // A bad payload is our bug, not the device's: keep the token.
        assertEquals(
            FcmOutcome.FAILED,
            fcmOutcome(400, """{"error":{"status":"INVALID_ARGUMENT","message":"Invalid JSON payload"}}"""),
        )
        assertEquals(FcmOutcome.FAILED, fcmOutcome(503, "unavailable"))
    }

    @Test
    fun `APNs tokens are hex and stored lowercase`() {
        val hex = "ABCDEF0123456789abcdef0123456789ABCDEF0123456789abcdef0123456789"
        assertEquals(hex.lowercase(), normalizeToken(hex, PushPlatform.IOS))
        assertNull(normalizeToken(fcmToken, PushPlatform.IOS))
    }

    @Test
    fun `FCM tokens keep their case`() {
        assertEquals(fcmToken, normalizeToken(fcmToken, PushPlatform.ANDROID))
        assertNull(normalizeToken("short", PushPlatform.ANDROID))
        assertNull(normalizeToken("has spaces and / slashes".repeat(3), PushPlatform.ANDROID))
    }
}
