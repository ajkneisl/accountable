// Grouped rows for settings-style screens, like an iOS grouped table.

import type { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { Card } from "./primitives"

/** Titled group of rows, like an iOS grouped table section. */
export function Section({
    title,
    footer,
    children
}: {
    title?: string
    footer?: string
    children: ReactNode
}) {
    return (
        <View className="gap-2">
            {title && (
                <Text className="px-1 text-[13px] font-semibold text-ink-3">
                    {title}
                </Text>
            )}
            <Card className="px-4">{children}</Card>
            {footer && (
                <Text className="px-1 text-[12px] leading-[17px] text-ink-3">
                    {footer}
                </Text>
            )}
        </View>
    )
}

export function Row({
    label,
    value,
    first = false,
    destructive = false,
    icon,
    onPress
}: {
    label: string
    value?: string
    first?: boolean
    destructive?: boolean
    /** Shown before the label, e.g. a member's color dot. */
    icon?: ReactNode
    /** Makes the row tappable and adds a disclosure chevron. */
    onPress?: () => void
}) {
    return (
        <Pressable
            disabled={!onPress}
            accessibilityRole={onPress ? "button" : undefined}
            onPress={onPress}
            className={`flex-row items-center justify-between gap-4 py-3.5 ${
                first ? "" : "border-t border-line-2"
            }`}
        >
            {icon}
            <Text
                className={`text-[15px] ${
                    destructive ? "text-coral-ink" : "text-ink"
                }`}
            >
                {label}
            </Text>
            <Text
                numberOfLines={1}
                className="flex-1 text-right text-[15px] text-ink-3"
            >
                {value}
            </Text>
            {onPress && !destructive && (
                <Text className="text-[18px] text-ink-3">›</Text>
            )}
        </Pressable>
    )
}
