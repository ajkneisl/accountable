// Shared layout for the sign-in and sign-up forms.

import { type ReactNode } from "react"
import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

/**
 * Large title over a form, with [footer] under it. The native header above
 * provides the back button; it's opaque, so the content needs no top inset.
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
                contentContainerClassName="gap-7 px-6 pb-8 pt-2"
                keyboardShouldPersistTaps="handled"
                // Lets iOS inset the scroll view for the keyboard, which behaves
                // better here than wrapping everything in a KeyboardAvoidingView.
                automaticallyAdjustKeyboardInsets
            >
                <View className="gap-1.5">
                    <Text className="text-[34px] font-bold leading-[40px] tracking-tight text-ink">
                        {title}
                    </Text>
                    {subtitle && (
                        <Text className="text-[16px] text-ink-3">
                            {subtitle}
                        </Text>
                    )}
                </View>

                <View className="gap-5">{children}</View>

                {footer && <View className="items-center">{footer}</View>}
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
        <Text className="text-[16px] text-ink-3">
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
