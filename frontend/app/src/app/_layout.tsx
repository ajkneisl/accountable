// Root layout — the native equivalent of web's main.tsx + App.tsx bootstrap.
//
// Restores the session from the stored tokens before rendering any route, so the
// first screen the user sees is already the right one. Also applies the light or
// dark theme to everything below it.

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
import {
    type Palette,
    restoreAppearance,
    themeVars,
    useColors,
    useScheme
} from "../theme"
// Defines the background sync task, which iOS may run before anything renders.
import "../features/integration/backgroundSync"
import "../../global.css"

// Re-apply the appearance picked in Settings as early as possible.
void restoreAppearance()

/** Feeds the scheme's palette to every NativeWind color class below it. */
function ThemeRoot({ children }: { children: React.ReactNode }) {
    const scheme = useScheme()
    return <View style={[{ flex: 1 }, themeVars[scheme]]}>{children}</View>
}

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
// Opaque rather than transparent: a transparent header makes the form inset
// itself under it, and that inset stacks with the keyboard's.
const authHeader = (colors: Palette) =>
    ({
        headerShown: true,
        headerTitle: "",
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: colors.ink
    }) as const

export default function RootLayout() {
    const colors = useColors()
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ApiProvider config={apiConfig}>
                    <StatusBar style="auto" />
                    <ThemeRoot>
                        <Bootstrap>
                            <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="index" />
                                <Stack.Screen name="welcome" />
                                <Stack.Screen
                                    name="login"
                                    options={authHeader(colors)}
                                />
                                <Stack.Screen
                                    name="register"
                                    options={authHeader(colors)}
                                />
                                <Stack.Screen name="(app)" />
                            </Stack>
                        </Bootstrap>
                    </ThemeRoot>
                </ApiProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    )
}
