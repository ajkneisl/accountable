// The week a page shows, as a plain heading over its cards with ‹ › to change
// it — not a card of its own, so the page's cards are only its content. One
// heading sets the week for everything under it.

import type { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { useColors } from "../theme"
import { BackChevronIcon, ChevronIcon } from "./icons"

export function WeekHeading({
    current,
    range,
    canGoBack = true,
    onBack,
    onForward,
    children
}: {
    /** Whether the week shown is the current one; there's no going forward from it. */
    current: boolean
    /** "Jun 16 – 22" for the week shown, or null while it isn't known. */
    range: string | null
    /** False on the earliest week the page goes back to. */
    canGoBack?: boolean
    onBack: () => void
    onForward: () => void
    /** Anything else that picks what the page shows, under the heading. */
    children?: ReactNode
}) {
    const colors = useColors()
    return (
        <View className="gap-3">
            <View className="flex-row items-center justify-between pl-1">
                <Text className="text-[16px] font-semibold tracking-tight text-ink">
                    {current ? "This week" : (range ?? "—")}
                    {current && range !== null && (
                        <Text className="text-[14px] font-normal text-ink-3">
                            {`  ${range}`}
                        </Text>
                    )}
                </Text>
                <View className="flex-row items-center gap-2">
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Previous week"
                        onPress={onBack}
                        disabled={!canGoBack}
                        hitSlop={8}
                        className={`h-8 w-8 items-center justify-center rounded-full bg-bg-sunken ${
                            canGoBack ? "" : "opacity-40"
                        }`}
                    >
                        <BackChevronIcon color={colors.ink2} size={16} />
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Next week"
                        onPress={onForward}
                        disabled={current}
                        hitSlop={8}
                        className={`h-8 w-8 items-center justify-center rounded-full bg-bg-sunken ${
                            current ? "opacity-40" : ""
                        }`}
                    >
                        <ChevronIcon color={colors.ink2} size={16} />
                    </Pressable>
                </View>
            </View>
            {children}
        </View>
    )
}
