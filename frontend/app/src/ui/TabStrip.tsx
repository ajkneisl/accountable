// A strip of text tabs for switching between whole pages of one screen: plain
// labels over an edge-to-edge hairline, with an underline under the selected
// one. It closes a screen's header rather than adding another box to it.
//
// The underline follows [position], so a pager can drive it with the finger
// (SwipePages) and a screen without one can simply animate it on a tap.

import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import Animated, {
    type SharedValue,
    useAnimatedStyle
} from "react-native-reanimated"
import { useColors } from "../theme"

/** The screen's side padding; the strip's hairline runs through it. */
export const TAB_STRIP_GUTTER = 20
const TAB_HEIGHT = 42
/** How far the underline stops short of each side of its tab. */
const UNDERLINE_INSET = 14

export function TabStrip({
    labels,
    active,
    position,
    onSelect
}: {
    labels: string[]
    /** The selected page. */
    active: number
    /** The selected page, fractional while a swipe is between two. */
    position: SharedValue<number>
    onSelect: (page: number) => void
}) {
    const colors = useColors()
    const [width, setWidth] = useState(0)
    const tab = width / labels.length
    const last = labels.length - 1

    const underline = useAnimatedStyle(() => ({
        transform: [
            {
                // Clamped so the bounce past either end stays under the strip.
                translateX: Math.min(last, Math.max(0, position.get())) * tab
            }
        ]
    }))

    return (
        // The hairline runs edge to edge, closing off the header above it.
        <View
            style={{ paddingHorizontal: TAB_STRIP_GUTTER }}
            className="border-b border-line-2"
        >
            <View
                accessibilityRole="tablist"
                onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
                className="flex-row"
            >
                {labels.map((label, i) => {
                    const selected = i === active
                    return (
                        <Pressable
                            key={label}
                            onPress={() => onSelect(i)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected }}
                            style={{ height: TAB_HEIGHT }}
                            className="flex-1 items-center justify-center"
                        >
                            <Text
                                numberOfLines={1}
                                className={`text-[15px] font-semibold ${
                                    selected ? "text-ink" : "text-ink-3"
                                }`}
                            >
                                {label}
                            </Text>
                        </Pressable>
                    )
                })}
                {width > 0 && (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            {
                                position: "absolute",
                                bottom: -1,
                                left: UNDERLINE_INSET,
                                width: tab - UNDERLINE_INSET * 2,
                                height: 2,
                                borderRadius: 1,
                                backgroundColor: colors.ink
                            },
                            underline
                        ]}
                    />
                )}
            </View>
        </View>
    )
}
