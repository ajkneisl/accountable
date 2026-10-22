// Shared layout for the sign-in and sign-up forms.

import { type ReactNode } from "react"
import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

/**
 * Large title over a form, with [footer] pinned below it. The native header
 * above provides the back button.
 */
export function AuthForm({
    title,
    subtitle,
    children,
    footer
}: {
    title: string
    subtitle?: string
    children: ReactNode
    footer?: ReactNode
}) {
    return (
        <SafeAreaView edges={["bottom"]} className="flex-1 bg-bg">
            <ScrollView
                contentContainerClassName="flex-grow gap-6 px-6 pb-6 pt-2"
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                // Lets iOS inset the scroll view for the keyboard, which behaves
                // better here than wrapping everything in a KeyboardAvoidingView.
                automaticallyAdjustKeyboardInsets
            >
                <View className="gap-1.5">
                    <Text className="text-[34px] font-bold tracking-tight text-ink">
                        {title}
                    </Text>
                    {subtitle && (
                        <Text className="text-[15px] text-ink-3">
                            {subtitle}
                        </Text>
                    )}
                </View>

                <View className="gap-4">{children}</View>

                {footer && (
                    <View className="mt-auto items-center pt-4">{footer}</View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

/** "Prompt  Action" line under a form, e.g. "New here? Create an account". */
export function AuthSwitch({
    prompt,
    action,
    onPress
}: {
    prompt: string
    action: string
    onPress: () => void
}) {
    return (
        <Text className="text-[15px] text-ink-3">
            {prompt}{" "}
            <Text
                onPress={onPress}
                accessibilityRole="link"
                className="font-semibold text-ink"
            >
                {action}
            </Text>
        </Text>
    )
}
