// Modal sheet for the app's forms (new goal, habit, workout, competition,
// account changes).
//
// Presented as a native iOS page sheet: the system dims and scales the screen
// behind it and handles swipe-to-dismiss. The primary action sits at the end of
// the scrolling body rather than pinned to the bottom, so the keyboard can't
// cover it; the scroll view insets itself for the keyboard.

import { type ReactNode } from "react"
import { Modal, Pressable, ScrollView, Text, View } from "react-native"
import { Button } from "./primitives"

export interface SheetAction {
    label: string
    onPress: () => void
    busy?: boolean
    variant?: "primary" | "danger"
}

export function Sheet({
    title,
    description,
    onClose,
    action,
    footer,
    children
}: {
    title: string
    description?: string
    onClose: () => void
    /** Full-width button under the form. */
    action?: SheetAction
    /** Rendered under the action — secondary or destructive extras. */
    footer?: ReactNode
    children: ReactNode
}) {
    return (
        <Modal
            visible
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-bg">
                <View className="flex-row justify-end px-5 pt-4">
                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        hitSlop={10}
                        className="h-9 w-9 items-center justify-center rounded-full bg-bg-sunken"
                    >
                        <Text className="text-[20px] leading-[22px] text-ink-2">
                            ×
                        </Text>
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerClassName="gap-6 px-5 pb-10 pt-1"
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets
                >
                    <View className="gap-2">
                        <Text className="text-[30px] font-bold tracking-tight text-ink">
                            {title}
                        </Text>
                        {description !== undefined && (
                            <Text className="text-[16px] leading-[22px] text-ink-3">
                                {description}
                            </Text>
                        )}
                    </View>

                    {children}

                    {action && (
                        <Button
                            label={action.label}
                            onPress={action.onPress}
                            busy={action.busy}
                            variant={action.variant ?? "primary"}
                            size="lg"
                            className="mt-2"
                        />
                    )}

                    {footer}
                </ScrollView>
            </View>
        </Modal>
    )
}

/** Labelled group inside a sheet: a field label over its control(s). */
export function SheetField({
    label,
    hint,
    children
}: {
    label: string
    hint?: string
    children: ReactNode
}) {
    return (
        <View className="gap-2.5">
            <Text className="text-[15px] font-semibold text-ink-2">
                {label}
            </Text>
            {children}
            {hint !== undefined && (
                <Text className="text-[13px] text-ink-3">{hint}</Text>
            )}
        </View>
    )
}
