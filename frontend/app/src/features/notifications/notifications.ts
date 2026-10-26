// Push notifications. The backend decides what to send and when (see the
// backend's notifications package) and sends it straight through APNs, so the
// app only hands it this device's token and opens the right screen when one is
// tapped. iOS only: the server doesn't speak FCM.

import { useEffect } from "react"
import { Platform } from "react-native"
import { type Href, router } from "expo-router"
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

export const pushSupported = Platform.OS === "ios"

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

    const { data: token } = await Notifications.getDevicePushTokenAsync()
    // A development build's token belongs to APNs' sandbox.
    await registerPushDevice(api, token, __DEV__)
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

/** Open the screen a tapped notification points at. */
export function useNotificationRouting(): void {
    const response = Notifications.useLastNotificationResponse()

    useEffect(() => {
        if (
            !response ||
            response.actionIdentifier !==
                Notifications.DEFAULT_ACTION_IDENTIFIER
        )
            return
        const path = response.notification.request.content.data?.path
        // Cleared so a remount doesn't open it again.
        Notifications.clearLastNotificationResponse()
        if (typeof path === "string" && path.startsWith("/"))
            router.push(path as Href)
    }, [response])
}
