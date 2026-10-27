// Standard scrolling screen body: safe-area insets, the app background, and
// pull-to-refresh (the phone-native replacement for the web's refresh buttons).

import { type ReactNode, useEffect, useRef, useState } from "react"
import { RefreshControl, ScrollView, View } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useColors } from "../theme"

export function Screen({
    children,
    refreshing = false,
    onRefresh,
    /**
     * The bottom edge is left to the scroll content (see below) so it can run
     * under the translucent tab bar.
     */
    edges = ["top"],
    topRight,
    bottomRight
}: {
    children: ReactNode
    refreshing?: boolean
    onRefresh?: () => void
    edges?: ("top" | "bottom" | "left" | "right")[]
    /** Pinned to the top-right of the content, beside the screen's eyebrow. */
    topRight?: ReactNode
    /** Floats over the bottom-right corner, e.g. an add button; stays put while the content scrolls. */
    bottomRight?: ReactNode
}) {
    const colors = useColors()
    // Inside native tabs the bottom inset includes the floating tab bar, so
    // padding by it lets the last card scroll clear of the bar. A floating
    // button needs room too, so the last card can scroll out from under it.
    const insets = useSafeAreaInsets()
    const bottom =
        (edges.includes("bottom") ? 40 : insets.bottom + 40) +
        (bottomRight !== undefined ? 64 : 0)

    // Only show the native spinner for a pull started on this screen. Loading
    // state is shared across tabs, and iOS leaves a RefreshControl stuck
    // spinning if it mounts refreshing or flips while the screen is hidden.
    const [pulling, setPulling] = useState(false)
    const sawRefresh = useRef(false)
    useEffect(() => {
        if (!pulling) return
        if (refreshing) sawRefresh.current = true
        else if (sawRefresh.current) {
            sawRefresh.current = false
            setPulling(false)
        }
    }, [pulling, refreshing])

    return (
        <SafeAreaView edges={edges} className="flex-1 bg-bg">
            <ScrollView
                contentContainerClassName="gap-5 px-5 pt-4"
                contentContainerStyle={{ paddingBottom: bottom }}
                refreshControl={
                    onRefresh && (
                        <RefreshControl
                            refreshing={pulling}
                            onRefresh={() => {
                                sawRefresh.current = false
                                setPulling(true)
                                onRefresh()
                            }}
                            tintColor={colors.ink3}
                        />
                    )
                }
            >
                {children}
                {topRight !== undefined && (
                    <View className="absolute right-5 top-3">{topRight}</View>
                )}
            </ScrollView>
            {bottomRight !== undefined && (
                <View
                    style={{
                        position: "absolute",
                        right: 20,
                        bottom: insets.bottom + 12
                    }}
                >
                    {bottomRight}
                </View>
            )}
        </SafeAreaView>
    )
}
