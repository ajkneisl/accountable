// The round top-right button shared by the gear and the sync button, or with
// [pill] a capsule that sizes to its content (the join code).
//
// On iOS 26+ it's an interactive Liquid Glass circle; older systems fall back
// to the flat card circle.

import type { ReactNode } from "react"
import { Pressable, View } from "react-native"
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect"

const SIZE = 40
const glass = isLiquidGlassAvailable()

export function CircleButton({
    label,
    onPress,
    disabled = false,
    pill = false,
    children
}: {
    /** Accessibility label. */
    label: string
    onPress: () => void
    disabled?: boolean
    /** A capsule as wide as its content instead of a fixed circle. */
    pill?: boolean
    /** The glyph; [glass] tells it which tint the circle wants. */
    children: (glass: boolean) => ReactNode
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled, busy: disabled }}
            hitSlop={8}
            disabled={disabled}
            onPress={onPress}
        >
            {glass ? (
                <GlassView
                    isInteractive
                    glassEffectStyle="regular"
                    style={{
                        ...(pill ? { paddingHorizontal: 14 } : { width: SIZE }),
                        height: SIZE,
                        borderRadius: SIZE / 2,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {children(true)}
                </GlassView>
            ) : (
                <View
                    style={{
                        ...(pill ? { paddingHorizontal: 14 } : { width: SIZE }),
                        height: SIZE
                    }}
                    className="flex-row items-center justify-center rounded-full border border-line-2 bg-bg-card"
                >
                    {children(false)}
                </View>
            )}
        </Pressable>
    )
}
