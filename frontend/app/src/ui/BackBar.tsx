// Back affordance for pushed screens. The stack headers are hidden so each screen
// can own its full layout (matching the web pages, which have no chrome of their
// own), so the back control is rendered inline instead.

import { Pressable, Text } from "react-native"
import { router } from "expo-router"

export function BackBar({ label = "Back" }: { label?: string }) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
                if (router.canGoBack()) router.back()
                else router.replace("/dashboard")
            }}
            hitSlop={8}
            className="flex-row items-center gap-1 self-start"
        >
            <Text className="text-[15px] text-ink-3">‹ {label}</Text>
        </Pressable>
    )
}
