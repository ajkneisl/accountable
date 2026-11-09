// Edit sheet for a goal: its target, minimum workout length (workouts goals),
// required days (daily goals) and accent color, plus the delete button
// (here rather than on the card so it can't be hit by accident). Source, metric
// and cadence are the goal's identity on the backend, so changing those means
// deleting the goal and creating a new one. A competition's shared goal uses it
// too, without the color (members are drawn in their own colors there) or
// required days.

import { useState } from "react"
import { Text, View } from "react-native"
import {
    ApiError,
    type Goal,
    type GoalColor,
    requiredDaysOf
} from "@shared/index"
import { confirm } from "../../../ui/confirm"
import { Sheet, SheetField } from "../../../ui/Sheet"
import { Button, ErrorList, Input } from "../../../ui/primitives"
import { ColorPicker } from "../../habits/components/ColorPicker"
import {
    formatAmount,
    goalColor,
    goalTitle,
    unitLabel,
    unitScale
} from "../types"
import { MinWorkoutField, takesMinWorkout } from "./MinWorkoutField"
import { RequiredDaysField } from "./RequiredDaysField"

function messages(err: unknown): string[] {
    if (err instanceof ApiError) return err.messages
    if (err instanceof Error) return [err.message]
    return ["Something went wrong"]
}

export function EditGoalSheet({
    goal,
    shared = false,
    onClose,
    onSave,
    onDelete
}: {
    goal: Pick<Goal, "integration" | "metric" | "period" | "target" | "color"> &
        Partial<Pick<Goal, "minWorkoutMin" | "requiredDays">>
    /** A competition's shared goal: no color, and deleting removes it for everyone. */
    shared?: boolean
    onClose: () => void
    /**
     * [target] is in stored units (minutes of sleep, not hours). [minWorkoutMin]
     * is null when every workout counts, or for a goal that doesn't take one.
     * [requiredDays] is only meaningful for a personal daily goal.
     */
    onSave: (
        target: number,
        color: GoalColor,
        minWorkoutMin: number | null,
        requiredDays: number[]
    ) => Promise<void>
    onDelete: () => Promise<void>
}) {
    // Targets are typed in display units (hours of sleep) but stored as counted.
    const scale = unitScale(goal.integration, goal.metric)
    const [target, setTarget] = useState(
        formatAmount(goal.integration, goal.metric, goal.target)
    )
    const [color, setColor] = useState<GoalColor>(goalColor(goal))
    const showMinWorkout = takesMinWorkout(goal.integration, goal.metric)
    const [minWorkout, setMinWorkout] = useState<number | null>(
        goal.minWorkoutMin ?? null
    )
    const showDays = !shared && goal.period === "DAILY"
    const [requiredDays, setRequiredDays] = useState(requiredDaysOf(goal))
    const [submitting, setSubmitting] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    const unit = unitLabel(goal.integration, goal.metric)
    const cadence = goal.period === "DAILY" ? "day" : "week"

    async function submit() {
        const targetNum = Number(target)
        const stored = Math.round(targetNum * scale)
        if (!Number.isFinite(targetNum) || stored <= 0) {
            setErrors(["Enter a target greater than zero."])
            return
        }
        setErrors([])
        setSubmitting(true)
        try {
            await onSave(
                stored,
                color,
                showMinWorkout ? minWorkout : null,
                requiredDays
            )
            onClose()
        } catch (err) {
            setErrors(messages(err))
        } finally {
            setSubmitting(false)
        }
    }

    async function askDelete() {
        const ok = shared
            ? await confirm(
                  "Remove goal?",
                  `"${goalTitle(goal)}" will be removed from this competition for every member.`,
                  "Remove",
                  true
              )
            : await confirm(
                  "Delete goal?",
                  `"${goalTitle(goal)}" will be removed. Your synced data stays put.`,
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
    const editable = [
        "target",
        ...(showMinWorkout ? ["minimum length"] : []),
        ...(showDays ? ["days"] : [])
    ].join(", ")

    return (
        <Sheet
            title={shared ? "Edit shared goal" : "Edit goal"}
            description={
                shared
                    ? "Change what every member is measured against."
                    : `Change its ${editable} or color.`
            }
            onClose={onClose}
            action={{
                label: submitting ? "Saving…" : "Save",
                onPress: submit,
                busy
            }}
            footer={
                <Button
                    label={
                        shared
                            ? deleting
                                ? "Removing…"
                                : "Remove goal"
                            : deleting
                              ? "Deleting…"
                              : "Delete goal"
                    }
                    variant="danger"
                    size="lg"
                    busy={deleting}
                    disabled={submitting}
                    onPress={askDelete}
                />
            }
        >
            <SheetField label="Target">
                <View className="flex-row items-center gap-3">
                    <Input
                        keyboardType={
                            scale === 1 ? "number-pad" : "decimal-pad"
                        }
                        value={target}
                        onChangeText={setTarget}
                        returnKeyType="done"
                        onSubmitEditing={submit}
                        className="w-28"
                    />
                    <Text className="text-[17px] text-ink-3">
                        {unit} / {cadence}
                    </Text>
                </View>
            </SheetField>

            {showDays && (
                <RequiredDaysField
                    value={requiredDays}
                    onChange={setRequiredDays}
                />
            )}

            {showMinWorkout && (
                <MinWorkoutField value={minWorkout} onChange={setMinWorkout} />
            )}

            {!shared && (
                <SheetField label="Color">
                    <ColorPicker value={color} onChange={setColor} />
                </SheetField>
            )}

            <ErrorList errors={errors} />
        </Sheet>
    )
}
