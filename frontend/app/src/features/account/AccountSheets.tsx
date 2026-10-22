// Sheets for the account actions in Settings: change email, change password,
// and delete account. Each one asks for the current password.

import { useState } from "react"
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
import { Sheet, SheetField } from "../../ui/Sheet"
import { ErrorList, Input } from "../../ui/primitives"

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
        <SheetField label="Current password">
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
        </SheetField>
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
            action={{
                label: "Save",
                onPress: submit,
                busy
            }}
        >
            <SheetField label="New email">
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
            </SheetField>
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
            action={{
                label: "Save",
                onPress: submit,
                busy
            }}
        >
            <CurrentPassword value={current} onChange={setCurrent} autoFocus />
            <SheetField
                label="New password"
                hint="At least 8 characters, with a letter and a number."
            >
                <Input
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    value={next}
                    onChangeText={setNext}
                    returnKeyType="next"
                />
            </SheetField>
            <SheetField label="Confirm new password">
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
            </SheetField>
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
            action={{
                label: "Delete",
                onPress: submit,
                busy,
                variant: "danger"
            }}
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
