// Root layout — the native equivalent of web's main.tsx + App.tsx bootstrap.
//
// Restores the session from the stored tokens before rendering any route, so the
// first screen the user sees is already the right one.

import { useEffect, useState } from "react"
import { View } from "react-native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { useSetAtom } from "jotai"
import { ApiProvider, syncTimezone, useApi } from "@shared/index"
import { apiConfig, restoreSession, userAtom } from "../auth"
import { Spinner } from "../ui/primitives"
import { colors } from "../theme"
import "../../global.css"

function Bootstrap({ children }: { children: React.ReactNode }) {
    const api = useApi()
    const setUser = useSetAtom(userAtom)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            // Null when signed out, or the session couldn't be restored.
            const me = await restoreSession(api)
            if (cancelled) return

            setUser(me)
            setReady(true)

            // Correct accounts created before a timezone was captured, so data
            // stops landing on the wrong day.
            if (me) void syncTimezone(api, me.timezone)
        })()

        return () => {
            cancelled = true
        }
    }, [api, setUser])

    if (!ready) {
        return (
            <View className="flex-1 items-center justify-center bg-bg">
                <Spinner size={32} />
            </View>
        )
    }

    return <>{children}</>
}

// Native header on the auth forms, so they get the iOS back button and swipe-back.
const authHeader = {
    headerShown: true,
    headerTitle: "",
    headerTransparent: true,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    headerTintColor: colors.ink
} as const

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ApiProvider config={apiConfig}>
                    <StatusBar style="dark" />
                    <Bootstrap>
                        <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="index" />
                            <Stack.Screen name="welcome" />
                            <Stack.Screen
                                name="login"
                                options={authHeader}
                            />
                            <Stack.Screen
                                name="register"
                                options={authHeader}
                            />
                            <Stack.Screen name="(app)" />
                        </Stack>
                    </Bootstrap>
                </ApiProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    )
}
