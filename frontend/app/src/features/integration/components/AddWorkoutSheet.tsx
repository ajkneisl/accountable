// Add workout sheet — manual entry form for an Apple Fitness workout.
// The same POST endpoint accepts rows from this app's HealthKit sync later.

import { useState } from "react"
import { Text, View } from "react-native"
import { ApiError, logWorkout, useApi, type WorkoutType } from "@shared/index"
import { Sheet } from "../../../ui/Sheet"
import {
    Button,
    ChoiceButton,
    ErrorList,
    Eyebrow,
    Input
} from "../../../ui/primitives"

const TYPES: { value: WorkoutType; label: string }[] = [
    { value: "RUN", label: "Run" },
    { value: "WEIGHTLIFTING", label: "Weightlifting" },
    { value: "BASKETBALL", label: "Basketball" },
    { value: "PICKLEBALL", label: "Pickleball" },
    { value: "OTHER", label: "Other" }
]

export function AddWorkoutSheet({
    onClose,
    onCreated
}: {
    onClose: () => void
    onCreated: () => void
}) {
    const api = useApi()
    const [type, setType] = useState<WorkoutType>("RUN")
    const [duration, setDuration] = useState("30")
    const [calories, setCalories] = useState("250")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    const durationNum = Number(duration)
    const caloriesNum = Number(calories)

    async function submit() {
        const issues: string[] = []
        if (!Number.isFinite(durationNum) || durationNum < 0)
            issues.push("Duration must be zero or more.")
        if (!Number.isFinite(caloriesNum) || caloriesNum < 0)
            issues.push("Calories must be zero or more.")
        if (issues.length) {
            setErrors(issues)
            return
        }
        setErrors([])
        setSubmitting(true)
        try {
            await logWorkout(api, {
                type,
                durationMin: durationNum,
                calories: caloriesNum
            })
            onCreated()
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
            title="Log a workout"
            description="Recorded under Apple Fitness for today."
            onClose={onClose}
            footer={
                <View className="flex-row justify-end gap-2.5">
                    <Button label="Cancel" variant="line" onPress={onClose} />
                    <Button
                        label={submitting ? "Saving…" : "Log workout →"}
                        onPress={submit}
                        busy={submitting}
                    />
                </View>
            }
        >
            <Eyebrow className="mb-2.5">Type</Eyebrow>
            <View className="mb-5 flex-row flex-wrap gap-2">
                {TYPES.map((t) => (
                    <ChoiceButton
                        key={t.value}
                        selected={type === t.value}
                        onPress={() => setType(t.value)}
                    >
                        <Text className="text-[13px] font-semibold text-ink">
                            {t.label}
                        </Text>
                    </ChoiceButton>
                ))}
            </View>

            <View className="mb-5 flex-row gap-3">
                <View className="flex-1">
                    <Eyebrow className="mb-2.5">Duration</Eyebrow>
                    <View className="flex-row items-center gap-2">
                        <Input
                            keyboardType="number-pad"
                            value={duration}
                            onChangeText={setDuration}
                            className="w-20"
                        />
                        <Text className="text-[13px] text-ink-3">min</Text>
                    </View>
                </View>
                <View className="flex-1">
                    <Eyebrow className="mb-2.5">Calories</Eyebrow>
                    <View className="flex-row items-center gap-2">
                        <Input
                            keyboardType="number-pad"
                            value={calories}
                            onChangeText={setCalories}
                            className="w-24"
                        />
                        <Text className="text-[13px] text-ink-3">kcal</Text>
                    </View>
                </View>
            </View>

            {errors.length > 0 && <ErrorList errors={errors} />}
        </Sheet>
    )
}
