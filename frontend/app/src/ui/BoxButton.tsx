// A small square icon button for actions inside a card, e.g. refreshing its
// list. While [busy] the icon gives way to a spinner of the same footprint, so
// the header around it never shifts.

import type { ReactNode } from "react"
import { ActivityIndicator, Pressable } from "react-native"
import { useColors } from "../theme"

export function BoxButton({
    label,
    onPress,
    busy = false,
    className = "",
    children
}: {
    /** Accessibility label; there's no visible text. */
    label: string
    onPress: () => void
    busy?: boolean
    className?: string
    /** The icon. */
    children: ReactNode
}) {
    const colors = useColors()
    return (
        <Pressable
            onPress={onPress}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ busy, disabled: busy }}
            hitSlop={8}
            className={`h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-bg-card active:opacity-60 ${className}`}
        >
            {busy ? (
                <ActivityIndicator size="small" color={colors.ink2} />
            ) : (
                children
            )}
        </Pressable>
    )
}
