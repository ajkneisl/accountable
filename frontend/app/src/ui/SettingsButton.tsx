// Top-right gear on every tab — settings is a pushed screen, not a tab.
//
// On iOS 26+ the gear sits on an interactive Liquid Glass circle; older systems
// fall back to the flat card circle.

import { Pressable, View } from "react-native"
import { router } from "expo-router"
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect"
import { colors } from "../theme"
import { GearIcon } from "./icons"

const SIZE = 40
const glass = isLiquidGlassAvailable()

export function SettingsButton() {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
            onPress={() => router.push("/settings")}
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
                    <GearIcon color={colors.ink} size={21} />
                </GlassView>
            ) : (
                <View
                    style={{ width: SIZE, height: SIZE }}
                    className="items-center justify-center rounded-full border border-line-2 bg-bg-card"
                >
                    <GearIcon color={colors.ink2} size={20} />
                </View>
            )}
        </Pressable>
    )
}
