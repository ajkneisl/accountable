// Create-or-join competition sheet — a "New" tab (name a competition) and a
// "Join" tab (enter a join code).

import { useState } from "react"
import { Text, View } from "react-native"
import {
    ApiError,
    createCompetition,
    joinCompetition,
    useApi
} from "@shared/index"
import { Sheet, SheetField } from "../../../ui/Sheet"
import { ChoiceButton, ErrorList, Input, MONO } from "../../../ui/primitives"

type Mode = "create" | "join"

function messageFor(err: unknown): string {
    if (err instanceof ApiError) return err.messages.join(", ")
    if (err instanceof Error) return err.message
    return "Something went wrong"
}

export function CompetitionSheet({
    initialMode = "create",
    onClose,
    onDone
}: {
    initialMode?: Mode
    onClose: () => void
    /** Called with the resulting competition id after a successful create/join. */
    onDone: (id: string) => void
}) {
    const api = useApi()
    const [mode, setMode] = useState<Mode>(initialMode)
    const [name, setName] = useState("")
    const [code, setCode] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit() {
        setError(null)
        setBusy(true)
        try {
            if (mode === "create") {
                const trimmed = name.trim()
                if (!trimmed) {
                    setError("Give your competition a name.")
                    return
                }
                const created = await createCompetition(api, { name: trimmed })
                onDone(created.id)
            } else {
                const trimmed = code.trim()
                if (!trimmed) {
                    setError("Enter a join code.")
                    return
                }
                const joined = await joinCompetition(api, trimmed)
                onDone(joined.id)
            }
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet
            title={mode === "create" ? "New competition" : "Join a competition"}
            onClose={onClose}
            action={{
                label: mode === "create" ? "Create competition" : "Join",
                onPress: submit,
                busy
            }}
        >
            <View className="flex-row gap-2.5">
                {(["create", "join"] as Mode[]).map((m) => (
                    <ChoiceButton
                        key={m}
                        selected={mode === m}
                        onPress={() => {
                            setMode(m)
                            setError(null)
                        }}
                        className="flex-1"
                    >
                        <Text
                            className={`text-center text-[16px] font-semibold ${
                                mode === m ? "text-ink" : "text-ink-3"
                            }`}
                        >
                            {m === "create" ? "New" : "Join with code"}
                        </Text>
                    </ChoiceButton>
                ))}
            </View>

            {mode === "create" ? (
                <SheetField label="Name">
                    <Input
                        autoFocus
                        value={name}
                        onChangeText={setName}
                        onSubmitEditing={submit}
                        returnKeyType="go"
                        placeholder="e.g. Spring grind"
                    />
                </SheetField>
            ) : (
                <SheetField label="Join code">
                    <Input
                        autoFocus
                        value={code}
                        onChangeText={(t) => setCode(t.toUpperCase())}
                        onSubmitEditing={submit}
                        returnKeyType="go"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        placeholder="ABC123"
                        style={{ fontFamily: MONO, letterSpacing: 1.2 }}
                    />
                </SheetField>
            )}

            {error !== null && <ErrorList errors={[error]} />}
        </Sheet>
    )
}
