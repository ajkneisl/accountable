// Sheets for the account actions in Settings: change email, change password,
// and delete account. Each one asks for the current password.

import { type ReactNode, useState } from "react"
import { Text, View } from "react-native"
import { useSetAtom } from "jotai"
import {
    ApiError,
    changeEmail,
    changePassword,
    deleteAccount,
    getSelf,
    useApi
} from "@shared/index"
import { tokenStore, useSignOut, userAtom } from "../../auth"
import { Sheet } from "../../ui/Sheet"
import { Button, ErrorList, Input, Label } from "../../ui/primitives"

function messages(err: unknown): string[] {
    if (err instanceof ApiError) return err.messages
    if (err instanceof Error) return [err.message]
    return ["Something went wrong"]
}

/** Runs [action] with busy and error state for a sheet's submit button. */
function useSubmit(action: () => Promise<void>) {
    const [busy, setBusy] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function submit() {
        setErrors([])
        setBusy(true)
        try {
            await action()
        } catch (err) {
            setErrors(messages(err))
        } finally {
            setBusy(false)
        }
    }

    return { busy, errors, submit }
}

function Footer({
    label,
    busy,
    destructive = false,
    onCancel,
    onSubmit
}: {
    label: string
    busy: boolean
    destructive?: boolean
    onCancel: () => void
    onSubmit: () => void
}) {
    return (
        <View className="flex-row justify-end gap-2.5">
            <Button label="Cancel" variant="line" onPress={onCancel} />
            <Button
                label={label}
                variant={destructive ? "danger" : "primary"}
                onPress={onSubmit}
                busy={busy}
            />
        </View>
    )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <View className="mb-4">
            <Label>{label}</Label>
            {children}
        </View>
    )
}

function CurrentPassword({
    value,
    onChange,
    onSubmit,
    autoFocus = false
}: {
    value: string
    onChange: (v: string) => void
    onSubmit?: () => void
    autoFocus?: boolean
}) {
    return (
        <Field label="Current password">
            <Input
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                autoFocus={autoFocus}
                value={value}
                onChangeText={onChange}
                onSubmitEditing={onSubmit}
                returnKeyType={onSubmit ? "go" : "next"}
            />
        </Field>
    )
}

export function ChangeEmailSheet({
    current,
    onClose
}: {
    current: string
    onClose: () => void
}) {
    const api = useApi()
    const setUser = useSetAtom(userAtom)
    const [email, setEmail] = useState(current)
    const [password, setPassword] = useState("")
    const { busy, errors, submit } = useSubmit(async () => {
        await changeEmail(api, password, email)
        setUser(await getSelf(api))
        onClose()
    })

    return (
        <Sheet
            title="Change email"
            onClose={onClose}
            footer={
                <Footer
                    label="Save"
                    busy={busy}
                    onCancel={onClose}
                    onSubmit={submit}
                />
            }
        >
            <Field label="New email">
                <Input
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    value={email}
                    onChangeText={setEmail}
                />
            </Field>
            <CurrentPassword
                value={password}
                onChange={setPassword}
                onSubmit={submit}
            />
            <ErrorList errors={errors} />
        </Sheet>
    )
}

export function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
    const api = useApi()
    const [current, setCurrent] = useState("")
    const [next, setNext] = useState("")
    const [confirm, setConfirm] = useState("")
    const { busy, errors, submit } = useSubmit(async () => {
        if (next !== confirm) throw new Error("New passwords don't match")
        await tokenStore.set(await changePassword(api, current, next))
        onClose()
    })

    return (
        <Sheet
            title="Change password"
            description="You'll be signed out on your other devices."
            onClose={onClose}
            footer={
                <Footer
                    label="Save"
                    busy={busy}
                    onCancel={onClose}
                    onSubmit={submit}
                />
            }
        >
            <CurrentPassword value={current} onChange={setCurrent} autoFocus />
            <Field label="New password">
                <Input
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    value={next}
                    onChangeText={setNext}
                    returnKeyType="next"
                />
                <Text className="mt-1.5 text-[12px] text-ink-3">
                    At least 8 characters, with a letter and a number.
                </Text>
            </Field>
            <Field label="Confirm new password">
                <Input
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    value={confirm}
                    onChangeText={setConfirm}
                    onSubmitEditing={submit}
                    returnKeyType="go"
                />
            </Field>
            <ErrorList errors={errors} />
        </Sheet>
    )
}

export function DeleteAccountSheet({ onClose }: { onClose: () => void }) {
    const api = useApi()
    const signOut = useSignOut()
    const [password, setPassword] = useState("")
    const { busy, errors, submit } = useSubmit(async () => {
        await deleteAccount(api, password)
        await signOut()
    })

    return (
        <Sheet
            title="Delete account"
            description="This permanently deletes your account, goals, habits, competitions, and connected integrations. It can't be undone."
            onClose={onClose}
            footer={
                <Footer
                    label="Delete"
                    busy={busy}
                    destructive
                    onCancel={onClose}
                    onSubmit={submit}
                />
            }
        >
            <CurrentPassword
                value={password}
                onChange={setPassword}
                onSubmit={submit}
                autoFocus
            />
            <ErrorList errors={errors} />
        </Sheet>
    )
}
