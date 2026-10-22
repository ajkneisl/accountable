// Modal sheet — the native stand-in for the web's fixed-overlay dialogs
// (NewGoalDialog, CompetitionDialog, AddWorkoutDialog).
//
// The web centres a 460px card over a scrim. On a phone that reads better as a
// bottom sheet, so this anchors to the bottom, rounds only the top corners, and
// lifts above the keyboard.

import { type ReactNode } from "react"
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export function Sheet({
    title,
    description,
    onClose,
    children,
    footer
}: {
    title: string
    description?: string
    onClose: () => void
    children: ReactNode
    /** Pinned action row, kept out of the scrolling body. */
    footer?: ReactNode
}) {
    const insets = useSafeAreaInsets()

    return (
        <Modal
            visible
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View className="flex-1 justify-end bg-black/40">
                {/* Tapping the scrim dismisses, matching the web overlay. */}
                <Pressable
                    accessibilityLabel="Close"
                    onPress={onClose}
                    className="flex-1"
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View
                        style={{ maxHeight: "88%", paddingBottom: insets.bottom }}
                        className="rounded-t-[24px] bg-bg-card"
                    >
                        <View className="flex-row items-start justify-between gap-3 px-6 pb-2 pt-6">
                            <View className="flex-1">
                                <Text className="text-[22px] font-bold tracking-tight text-ink">
                                    {title}
                                </Text>
                                {description !== undefined && (
                                    <Text className="mt-1 text-[13px] text-ink-3">
                                        {description}
                                    </Text>
                                )}
                            </View>
                            <Pressable
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                                className="h-8 w-8 items-center justify-center rounded-full bg-bg-sunken"
                            >
                                <Text className="text-[16px] text-ink-3">×</Text>
                            </Pressable>
                        </View>

                        <ScrollView
                            className="px-6"
                            contentContainerClassName="pb-2 pt-3"
                            keyboardShouldPersistTaps="handled"
                        >
                            {children}
                        </ScrollView>

                        {footer !== undefined && (
                            <View className="border-t border-line-2 px-6 pb-2 pt-4">
                                {footer}
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    )
}
