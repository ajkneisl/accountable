// Forgot password, pushed from sign-in. Sends a reset link to the account's
// email; the link opens beacc.app, where the new password is chosen.

import { useState } from "react"
import { Text, View } from "react-native"
import { router } from "expo-router"
import { ApiError, requestPasswordReset, useApi } from "@shared/index"
import { AuthForm } from "../features/auth/components"
import { Button, ErrorList, Input, Label } from "../ui/primitives"

export default function ForgotPassword() {
    const api = useApi()
    const [identifier, setIdentifier] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [sent, setSent] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function onSubmit() {
        setErrors([])
        setSubmitting(true)
        try {
            await requestPasswordReset(api, identifier)
            setSent(true)
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.messages)
            else if (err instanceof Error) setErrors([err.message])
            else setErrors(["Something went wrong"])
        } finally {
            setSubmitting(false)
        }
    }

    if (sent) {
        return (
            <AuthForm
                title="Check your email"
                subtitle="If an account matches, we've sent it a link to reset the password. It works for an hour."
            >
                <Text className="text-[15px] leading-[21px] text-ink-3">
                    Open the link on any device, choose a new password, then
                    sign in here with it.
                </Text>
                <Button
                    label="Back to sign in"
                    size="lg"
                    onPress={() => router.back()}
                />
            </AuthForm>
        )
    }

    return (
        <AuthForm
            title="Reset password"
            subtitle="Enter your username or email and we'll send you a link."
        >
            <View>
                <Label>Username or email</Label>
                <Input
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="send"
                    value={identifier}
                    onChangeText={setIdentifier}
                    onSubmitEditing={onSubmit}
                />
            </View>

            <ErrorList errors={errors} />

            <Button
                label="Send reset link"
                size="lg"
                onPress={onSubmit}
                busy={submitting}
                className="mt-2"
            />
        </AuthForm>
    )
}
