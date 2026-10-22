// New-habit sheet: a name and an accent color. Habits are simple daily
// check-offs, so there's no cadence or target to choose.

import { useState } from "react"
import { Text, View } from "react-native"
import { ApiError, type HabitColor } from "@shared/index"
import { Sheet } from "../../../ui/Sheet"
import {
    Button,
    ChoiceButton,
    Dot,
    ErrorList,
    Eyebrow,
    Input
} from "../../../ui/primitives"
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
            footer={
                <View className="flex-row justify-end gap-2.5">
                    <Button label="Cancel" variant="line" onPress={onClose} />
                    <Button
                        label={submitting ? "Adding…" : "Add habit"}
                        onPress={submit}
                        busy={submitting}
                    />
                </View>
            }
        >
            <Eyebrow className="mb-2.5">Name</Eyebrow>
            <Input
                value={name}
                onChangeText={setName}
                placeholder="Read 20 pages"
                maxLength={NAME_MAX}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submit}
                className="mb-5"
            />

            <Eyebrow className="mb-2.5">Color</Eyebrow>
            <View className="mb-5 flex-row gap-2">
                {HABIT_COLORS.map((c) => (
                    <ChoiceButton
                        key={c}
                        selected={color === c}
                        onPress={() => setColor(c)}
                        className="flex-1"
                    >
                        <View className="items-center gap-1.5">
                            <Dot color={HABIT_PALETTE[c].fill} size={14} />
                            <Text className="text-[12px] font-medium text-ink">
                                {HABIT_PALETTE[c].label}
                            </Text>
                        </View>
                    </ChoiceButton>
                ))}
            </View>

            <ErrorList errors={errors} />
        </Sheet>
    )
}
