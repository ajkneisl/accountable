// Sign-in screen, pushed from /welcome.

import { useState } from "react"
import { View } from "react-native"
import { router } from "expo-router"
import { useSetAtom } from "jotai"
import { ApiError, getSelf, login, syncTimezone, useApi } from "@shared/index"
import { tokenStore, userAtom } from "../auth"
import { AuthForm, AuthSwitch } from "../features/auth/components"
import { Button, ErrorList, Input, Label } from "../ui/primitives"

export default function Login() {
    const api = useApi()
    const setUser = useSetAtom(userAtom)
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function onSubmit() {
        setErrors([])
        setSubmitting(true)
        try {
            const tokens = await login(api, username, password)
            await tokenStore.set(tokens)
            const me = await getSelf(api)
            setUser(me)
            await syncTimezone(api, me.timezone)
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
            title="Sign in"
            footer={
                <AuthSwitch
                    prompt="New here?"
                    action="Create an account"
                    onPress={() => router.replace("/register")}
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
                <Label>Password</Label>
                <Input
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={onSubmit}
                    returnKeyType="go"
                />
            </View>

            <ErrorList errors={errors} />

            <Button
                label="Sign in"
                size="lg"
                onPress={onSubmit}
                busy={submitting}
                className="mt-2"
            />
        </AuthForm>
    )
}
