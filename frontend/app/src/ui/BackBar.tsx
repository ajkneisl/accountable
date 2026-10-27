// Back affordance for pushed screens. The stack headers are hidden so each screen
// can own its full layout (matching the web pages, which have no chrome of their
// own), so the back control is rendered inline instead: a pill matching the
// round buttons in the top right, so it reads as a button rather than a caption.

import { Text, View } from "react-native"
import { router } from "expo-router"
import { useColors } from "../theme"
import { CircleButton } from "./CircleButton"
import { BackChevronIcon } from "./icons"

export function BackBar({ label = "Back" }: { label?: string }) {
    const colors = useColors()
    return (
        // Sits 4pt higher so it lines up with the top-right buttons.
        <View className="-mt-1 max-w-[60%] self-start">
            <CircleButton
                pill
                label={label === "Back" ? label : `Back to ${label}`}
                onPress={() => {
                    if (router.canGoBack()) router.back()
                    else router.replace("/dashboard")
                }}
            >
                {() => (
                    <>
                        <View className="-ml-1.5 mr-1">
                            <BackChevronIcon color={colors.ink} size={20} />
                        </View>
                        <Text
                            numberOfLines={1}
                            className="flex-shrink text-[15px] font-semibold text-ink"
                        >
                            {label}
                        </Text>
                    </>
                )}
            </CircleButton>
        </View>
    )
}
