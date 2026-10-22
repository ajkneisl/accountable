// New-habit sheet: a name and an accent color. Habits are simple daily
// check-offs, so there's no cadence or target to choose.

import { useState } from "react"
import { Text, View } from "react-native"
import { ApiError, type HabitColor } from "@shared/index"
import { Sheet, SheetField } from "../../../ui/Sheet"
import { ChoiceButton, Dot, ErrorList, Input } from "../../../ui/primitives"
import { HABIT_COLORS, HABIT_PALETTE } from "../grid"

/** Mirrors HABIT_NAME_MAX on the backend. */
const NAME_MAX = 40

export function NewHabitSheet({
    onClose,
    onCreate
}: {
    onClose: () => void
    onCreate: (name: string, color: HabitColor) => Promise<void>
}) {
    const [name, setName] = useState("")
    const [color, setColor] = useState<HabitColor>("LIME")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function submit() {
        const trimmed = name.trim()
        if (!trimmed) {
            setErrors(["Give your habit a name."])
            return
        }
        setErrors([])
        setSubmitting(true)
        try {
            await onCreate(trimmed, color)
            onClose()
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.messages)
            else if (err instanceof Error) setErrors([err.message])
            else setErrors(["Something went wrong"])
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Sheet
            title="New habit"
            description="Something you want to do every day. Check it off and watch the heatmap fill in."
            onClose={onClose}
            action={{
                label: submitting ? "Adding…" : "Add habit",
                onPress: submit,
                busy: submitting
            }}
        >
            <SheetField label="Name">
                <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="Read 20 pages"
                    maxLength={NAME_MAX}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={submit}
                />
            </SheetField>

            <SheetField label="Color">
                <View className="flex-row gap-2.5">
                    {HABIT_COLORS.map((c) => (
                        <ChoiceButton
                            key={c}
                            selected={color === c}
                            onPress={() => setColor(c)}
                            className="flex-1"
                        >
                            <View className="items-center gap-2">
                                <Dot color={HABIT_PALETTE[c].fill} size={22} />
                                <Text className="text-[14px] font-medium text-ink">
                                    {HABIT_PALETTE[c].label}
                                </Text>
                            </View>
                        </ChoiceButton>
                    ))}
                </View>
            </SheetField>

            <ErrorList errors={errors} />
        </Sheet>
    )
}
