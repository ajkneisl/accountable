// Push notifications. The backend decides what to send and when (see the
// backend's notifications package) and sends it straight through APNs (iOS) or
// FCM (Android), so the app only hands it this device's token and opens the
// right screen when one is tapped.

import { useEffect } from "react"
import { Platform } from "react-native"
import { type Href, router, useSegments } from "expo-router"
import * as Notifications from "expo-notifications"
import * as SecureStore from "expo-secure-store"
import {
    type ApiConfig,
    registerPushDevice,
    unregisterPushDevice
} from "@shared/index"

/** The token last registered, so sign-out can unregister it. */
const TOKEN_KEY = "accountable_push_token"

export type PushPermission = "granted" | "denied" | "undetermined"

export const pushSupported = Platform.OS === "ios" || Platform.OS === "android"

/**
 * The Android channel pushes are posted to; the backend names it in every FCM
 * message (FCM_CHANNEL_ID in Fcm.kt). Android 8+ needs a channel before it'll
 * show anything, and it's where people turn Beacc's notifications up or down.
 */
const ANDROID_CHANNEL_ID = "default"

if (Platform.OS === "android")
    void Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "Beacc",
        importance: Notifications.AndroidImportance.HIGH
    }).catch(() => {})

// Show a push that arrives while the app is open, too.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false
    })
})

export async function pushPermission(): Promise<PushPermission> {
    if (!pushSupported) return "denied"
    return (await Notifications.getPermissionsAsync()).status
}

/**
 * Register this device with the server. With [ask], shows the permission
 * prompt if it hasn't been answered yet (iOS only ever shows it once).
 * Resolves whether pushes are on. Re-registering is harmless, and keeps the
 * server's token current if iOS has issued a new one.
 */
export async function enablePushes(
    api: ApiConfig,
    ask: boolean
): Promise<boolean> {
    if (!pushSupported) return false
    let status = await pushPermission()
    if (status === "undetermined" && ask)
        status = (await Notifications.requestPermissionsAsync()).status
    if (status !== "granted") return false

    let token: string
    try {
        token = (await Notifications.getDevicePushTokenAsync()).data
    } catch (err) {
        // On Android this fails when the build has no google-services.json, so
        // Firebase was never set up. Pushes stay off rather than erroring.
        if (Platform.OS !== "android") throw err
        console.warn("No FCM token; push notifications are off", err)
        return false
    }
    // A development build's token belongs to APNs' sandbox. Ignored for FCM.
    await registerPushDevice(
        api,
        token,
        __DEV__,
        Platform.OS === "android" ? "android" : "ios"
    )
    try {
        await SecureStore.setItemAsync(TOKEN_KEY, token)
    } catch {
        // Only means sign-out can't unregister; the token moves on next sign-in.
    }
    return true
}

/** Stop the server pushing to this device, e.g. on sign-out. Best-effort. */
export async function disablePushes(api: ApiConfig): Promise<void> {
    try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY)
        if (!token) return
        await unregisterPushDevice(api, token)
        await SecureStore.deleteItemAsync(TOKEN_KEY)
    } catch {
        // Offline: the push keeps going until the token is next registered.
    }
}

/**
 * Open the screen a tapped notification points at.
 *
 * A tap often cold-starts the app, and this runs as soon as the authenticated
 * area mounts, before its nested navigators have registered their state. A
 * navigation at that point is worked out against a tree that isn't there yet, so
 * the tap waits for the route to reach a screen inside that area. It's only cleared
 * once it's being handled, so a tap that arrives early isn't lost.
 *
 * Uses navigate, not push: a tab that's already there gets switched to, rather than
 * a second copy of the tabs being stacked on top.
 */
export function useNotificationRouting(): void {
    const response = Notifications.useLastNotificationResponse()
    const segments = useSegments() as string[]
    const ready = segments[0] === "(app)" && segments.length > 1

    useEffect(() => {
        if (
            !ready ||
            !response ||
            response.actionIdentifier !==
                Notifications.DEFAULT_ACTION_IDENTIFIER
        )
            return
        const path = response.notification.request.content.data?.path
        // Cleared so a remount doesn't open it again.
        Notifications.clearLastNotificationResponse()
        if (typeof path === "string" && path.startsWith("/"))
            router.navigate(path as Href)
    }, [response, ready])
}
