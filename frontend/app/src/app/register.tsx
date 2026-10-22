// Account creation screen, pushed from /welcome.

import { useState } from "react"
import { Text, View } from "react-native"
import { router } from "expo-router"
import { useSetAtom } from "jotai"
import { ApiError, getSelf, register, useApi } from "@shared/index"
import { tokenStore, userAtom } from "../auth"
import { AuthForm, AuthSwitch } from "../features/auth/components"
import { Button, ErrorList, Input, Label } from "../ui/primitives"

export default function Register() {
    const api = useApi()
    const setUser = useSetAtom(userAtom)
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function onSubmit() {
        setErrors([])
        setSubmitting(true)
        try {
            const tokens = await register(api, username, password, email)
            await tokenStore.set(tokens)
            setUser(await getSelf(api))
            router.replace("/dashboard")
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.messages)
            else if (err instanceof Error) setErrors([err.message])
            else setErrors(["Something went wrong"])
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AuthForm
            title="Create account"
            footer={
                <AuthSwitch
                    prompt="Already have an account?"
                    action="Sign in"
                    onPress={() => router.replace("/login")}
                />
            }
        >
            <View>
                <Label>Username</Label>
                <Input
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="next"
                    value={username}
                    onChangeText={setUsername}
                />
            </View>

            <View>
                <Label>Email</Label>
                <Input
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    value={email}
                    onChangeText={setEmail}
                />
            </View>

            <View>
                <Label>Password</Label>
                <Input
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={onSubmit}
                    returnKeyType="go"
                />
                <Text className="mt-1.5 text-[12px] text-ink-3">
                    At least 8 characters.
                </Text>
            </View>

            <ErrorList errors={errors} />

            <Button
                label="Create account"
                size="lg"
                onPress={onSubmit}
                busy={submitting}
                className="mt-2"
            />
        </AuthForm>
    )
}
