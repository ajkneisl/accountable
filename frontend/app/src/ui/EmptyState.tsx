// What a list shows before it has anything in it: a short title and, when
// given, the action that fills it. [framed] draws it as its own dashed card (on
// a tab); without, it sits inside a card that already has its own header.

import { Text, View } from "react-native"
import { Button } from "./primitives"

export function EmptyState({
    title,
    action,
    framed = false
}: {
    title: string
    action?: { label: string; onPress: () => void }
    framed?: boolean
}) {
    return (
        <View
            className={`items-center gap-3 ${
                framed
                    ? "rounded-lg border border-dashed border-line bg-bg-sunken/50 px-5 py-8"
                    : "py-3"
            }`}
        >
            <Text className="text-[15px] font-semibold text-ink">{title}</Text>
            {action && (
                <Button
                    label={action.label}
                    size="sm"
                    onPress={action.onPress}
                />
            )}
        </View>
    )
}
