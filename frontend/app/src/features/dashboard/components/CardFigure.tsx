// The headline number in the top-right of each dashboard card: a large figure
// with a short caption under it, so every card reads the same way.

import type { ReactNode } from "react"
import { Text, View } from "react-native"
import { Mono } from "../../../ui/primitives"

export function CardFigure({
    value,
    caption,
    icon
}: {
    value: string
    caption: string
    /** Shown after the caption, e.g. an info glyph when the figure is tappable. */
    icon?: ReactNode
}) {
    return (
        <View className="items-end">
            <Mono className="text-[22px] font-bold text-ink">{value}</Mono>
            <View className="flex-row items-center gap-1">
                <Text className="text-[12px] text-ink-3">{caption}</Text>
                {icon}
            </View>
        </View>
    )
}
