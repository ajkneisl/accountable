// Habit sheet: a name and an accent color, for a new habit or an existing one.
// Habits are simple daily check-offs, so there's no cadence or target to
// choose. Editing also carries the habit's delete button — it lives here
// rather than on the card so it can't be hit by accident.

import { useState } from "react"
import { Text, View } from "react-native"
import { ApiError, type Habit, type HabitColor } from "@shared/index"
import { confirm } from "../../../ui/confirm"
import { Sheet, SheetField } from "../../../ui/Sheet"
import {
    Button,
    ChoiceButton,
    Dot,
    ErrorList,
    Input
} from "../../../ui/primitives"
import { HABIT_COLORS, HABIT_PALETTE } from "../grid"

/** Mirrors HABIT_NAME_MAX on the backend. */
const NAME_MAX = 40

function messages(err: unknown): string[] {
    if (err instanceof ApiError) return err.messages
    if (err instanceof Error) return [err.message]
    return ["Something went wrong"]
}

export function HabitSheet({
    habit,
    onClose,
    onSave,
    onDelete
}: {
    /** The habit being edited; omitted when creating one. */
    habit?: Habit
    onClose: () => void
    onSave: (name: string, color: HabitColor) => Promise<void>
    onDelete?: () => Promise<void>
}) {
    const [name, setName] = useState(habit?.name ?? "")
    const [color, setColor] = useState<HabitColor>(habit?.color ?? "LIME")
    const [submitting, setSubmitting] = useState(false)
    const [deleting, setDeleting] = useState(false)
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
            await onSave(trimmed, color)
            onClose()
        } catch (err) {
            setErrors(messages(err))
        } finally {
            setSubmitting(false)
        }
    }

    async function askDelete() {
        if (!habit || !onDelete) return
        const ok = await confirm(
            "Delete habit?",
            `"${habit.name}" and its whole history will be removed.`,
            "Delete",
            true
        )
        if (!ok) return
        setDeleting(true)
        try {
            await onDelete()
            onClose()
        } catch (err) {
            setErrors(messages(err))
            setDeleting(false)
        }
    }

    const busy = submitting || deleting

    return (
        <Sheet
            title={habit ? "Edit habit" : "New habit"}
            description={
                habit
                    ? "Rename it or change its color. Your history stays put."
                    : "Something you want to do every day. Check it off and watch the heatmap fill in."
            }
            onClose={onClose}
            action={{
                label: habit
                    ? submitting
                        ? "Saving…"
                        : "Save"
                    : submitting
                      ? "Adding…"
                      : "Add habit",
                onPress: submit,
                busy
            }}
            footer={
                habit &&
                onDelete && (
                    <Button
                        label={deleting ? "Deleting…" : "Delete habit"}
                        variant="danger"
                        size="lg"
                        busy={deleting}
                        disabled={submitting}
                        onPress={askDelete}
                    />
                )
            }
        >
            <SheetField label="Name">
                <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="Read 20 pages"
                    maxLength={NAME_MAX}
                    autoFocus={!habit}
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
