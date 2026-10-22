// Add workout sheet — manual entry form for an Apple Fitness workout.
// The same POST endpoint accepts rows from this app's HealthKit sync later.

import { useState } from "react"
import { Text, View } from "react-native"
import { ApiError, logWorkout, useApi, type WorkoutType } from "@shared/index"
import { Sheet, SheetField } from "../../../ui/Sheet"
import { ChoiceButton, ErrorList, Input } from "../../../ui/primitives"

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
            action={{
                label: submitting ? "Saving…" : "Log workout",
                onPress: submit,
                busy: submitting
            }}
        >
            <SheetField label="Type">
                <View className="flex-row flex-wrap gap-2.5">
                    {TYPES.map((t) => (
                        <ChoiceButton
                            key={t.value}
                            selected={type === t.value}
                            onPress={() => setType(t.value)}
                        >
                            <Text className="text-[16px] font-semibold text-ink">
                                {t.label}
                            </Text>
                        </ChoiceButton>
                    ))}
                </View>
            </SheetField>

            <View className="flex-row gap-4">
                <View className="flex-1">
                    <SheetField label="Duration">
                        <View className="flex-row items-center gap-2.5">
                            <Input
                                keyboardType="number-pad"
                                value={duration}
                                onChangeText={setDuration}
                                className="flex-1"
                            />
                            <Text className="text-[17px] text-ink-3">min</Text>
                        </View>
                    </SheetField>
                </View>
                <View className="flex-1">
                    <SheetField label="Calories">
                        <View className="flex-row items-center gap-2.5">
                            <Input
                                keyboardType="number-pad"
                                value={calories}
                                onChangeText={setCalories}
                                className="flex-1"
                            />
                            <Text className="text-[17px] text-ink-3">kcal</Text>
                        </View>
                    </SheetField>
                </View>
            </View>

            {errors.length > 0 && <ErrorList errors={errors} />}
        </Sheet>
    )
}
