// The round top-right button shared by the gear and the sync button.
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
    children
}: {
    /** Accessibility label. */
    label: string
    onPress: () => void
    disabled?: boolean
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
                        width: SIZE,
                        height: SIZE,
                        borderRadius: SIZE / 2,
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {children(true)}
                </GlassView>
            ) : (
                <View
                    style={{ width: SIZE, height: SIZE }}
                    className="items-center justify-center rounded-full border border-line-2 bg-bg-card"
                >
                    {children(false)}
                </View>
            )}
        </Pressable>
    )
}
