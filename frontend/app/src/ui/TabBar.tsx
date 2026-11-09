// The floating bar under the main tabs. Its pill follows the pager, so it moves
// with the finger during a swipe. Liquid Glass on iOS 26+; older systems get the
// flat card look.

import { useState } from "react"
import { Pressable, Text, useWindowDimensions, View } from "react-native"
import { Host, Image } from "@expo/ui/swift-ui"
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect"
import Animated, {
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle
} from "react-native-reanimated"
import type { SFSymbol } from "sf-symbols-typescript"
import { scheduleOnRN } from "react-native-worklets"
import { useColors } from "../theme"

export type TabBarItem = { label: string; sf: SFSymbol }

export const TAB_BAR_HEIGHT = 62

const glass = isLiquidGlassAvailable()
const SIDE_GUTTER = 16
const MAX_WIDTH = 420
const PADDING = 4
const PILL_HEIGHT = TAB_BAR_HEIGHT - PADDING * 2

/** Distance from the screen's bottom edge, given its bottom safe-area inset. */
export function tabBarBottom(bottomInset: number): number {
    return Math.max(bottomInset - 12, 12)
}

export function TabBar({
    tabs,
    initial,
    position,
    onSelect
}: {
    tabs: TabBarItem[]
    /** The tab selected on mount. */
    initial: number
    /** The selected tab, fractional while a swipe is between two. */
    position: SharedValue<number>
    onSelect: (index: number) => void
}) {
    const colors = useColors()
    const window = useWindowDimensions()
    const width = Math.min(window.width - SIDE_GUTTER * 2, MAX_WIDTH)
    const segment = (width - PADDING * 2) / tabs.length
    const last = tabs.length - 1

    // Changes tint once the swipe is past halfway, not on every frame.
    const [active, setActive] = useState(initial)
    useAnimatedReaction(
        () => Math.round(Math.min(last, Math.max(0, position.get()))),
        (now, previous) => {
            if (now !== previous) scheduleOnRN(setActive, now)
        },
        [last]
    )

    const pill = useAnimatedStyle(() => ({
        transform: [
            {
                // Clamped so the bounce past either end stays inside the bar.
                translateX:
                    Math.min(last, Math.max(0, position.get())) * segment
            }
        ]
    }))

    const content = (
        <>
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: "absolute",
                        top: PADDING,
                        left: PADDING,
                        width: segment,
                        height: PILL_HEIGHT,
                        borderRadius: PILL_HEIGHT / 2,
                        backgroundColor: colors.ink,
                        opacity: 0.1
                    },
                    pill
                ]}
            />
            {tabs.map((tab, i) => {
                const tint = i === active ? colors.ink : colors.ink3
                return (
                    <Pressable
                        key={tab.label}
                        onPress={() => onSelect(i)}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.label}
                        accessibilityState={{ selected: i === active }}
                        style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2
                        }}
                    >
                        <Host matchContents>
                            <Image systemName={tab.sf} size={20} color={tint} />
                        </Host>
                        <Text
                            numberOfLines={1}
                            style={{ color: tint }}
                            className="text-[10px] font-semibold"
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                )
            })}
        </>
    )

    const shape = {
        height: TAB_BAR_HEIGHT,
        borderRadius: TAB_BAR_HEIGHT / 2,
        flexDirection: "row",
        padding: PADDING
    } as const

    return (
        <View
            style={{ width, alignSelf: "center" }}
            accessibilityRole="tablist"
        >
            {glass ? (
                <GlassView glassEffectStyle="regular" style={shape}>
                    {content}
                </GlassView>
            ) : (
                <View style={shape} className="border border-line-2 bg-bg-card">
                    {content}
                </View>
            )}
        </View>
    )
}
