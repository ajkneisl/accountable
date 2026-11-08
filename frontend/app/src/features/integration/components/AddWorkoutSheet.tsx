// Add workout sheet — logs a workout Apple Health didn't catch. It counts the same
// as an imported one, and shows as manual on the feed and in the day's workouts.

import { useState } from "react"
import { Text, View } from "react-native"
import { ApiError, logWorkout, useApi, type WorkoutType } from "@shared/index"
import { Sheet, SheetField } from "../../../ui/Sheet"
import { ChoiceButton, ErrorList, Input } from "../../../ui/primitives"
import { WORKOUT_LABEL } from "./WorkoutCard"

const TYPES = Object.entries(WORKOUT_LABEL).map(([value, label]) => ({
    value: value as WorkoutType,
    label
}))

const HOUR_MS = 60 * 60 * 1000

/** Logging it later still puts it on the right day, and in the right order. */
const WHEN: { label: string; ago: number }[] = [
    { label: "Just now", ago: 0 },
    { label: "1 hr ago", ago: HOUR_MS },
    { label: "3 hrs ago", ago: 3 * HOUR_MS },
    { label: "Yesterday", ago: 24 * HOUR_MS }
]

const DURATIONS = [15, 30, 45, 60]

const MINUTES_PER_DAY = 24 * 60

const WHEN_FMT = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
})

function Choice({
    label,
    selected,
    onPress
}: {
    label: string
    selected: boolean
    onPress: () => void
}) {
    return (
        <ChoiceButton
            selected={selected}
            onPress={onPress}
            className="px-3.5 py-2.5"
        >
            <Text className="text-[15px] font-semibold text-ink">{label}</Text>
        </ChoiceButton>
    )
}

export function AddWorkoutSheet({
    onClose,
    onCreated
}: {
    onClose: () => void
    onCreated: () => void
}) {
    const api = useApi()
    const [type, setType] = useState<WorkoutType>("RUN")
    const [ago, setAgo] = useState(0)
    // Left blank rather than guessed: these feed into goals and what others see.
    const [duration, setDuration] = useState("")
    const [calories, setCalories] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function submit() {
        const issues: string[] = []
        const minutes = Number(duration)
        if (
            !/^\d+$/.test(duration.trim()) ||
            minutes < 1 ||
            minutes > MINUTES_PER_DAY
        )
            issues.push("Enter how many minutes it lasted.")
        const burned = calories.trim() === "" ? 0 : Number(calories)
        if (calories.trim() !== "" && !/^\d+$/.test(calories.trim()))
            issues.push("Calories must be a whole number.")
        if (issues.length) {
            setErrors(issues)
            return
        }
        setErrors([])
        setSubmitting(true)
        try {
            await logWorkout(api, {
                type,
                durationMin: minutes,
                calories: burned,
                happenedAt: Date.now() - ago
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
            description="Counts toward your goals like any other workout, and shows as logged manually."
            onClose={onClose}
            action={{
                label: submitting ? "Saving…" : "Log workout",
                onPress: submit,
                busy: submitting
            }}
        >
            <SheetField label="Type">
                <View className="flex-row flex-wrap gap-2">
                    {TYPES.map((t) => (
                        <Choice
                            key={t.value}
                            label={t.label}
                            selected={type === t.value}
                            onPress={() => setType(t.value)}
                        />
                    ))}
                </View>
            </SheetField>

            <SheetField label="When">
                <View className="flex-row flex-wrap gap-2">
                    {WHEN.map((w) => (
                        <Choice
                            key={w.label}
                            label={w.label}
                            selected={ago === w.ago}
                            onPress={() => setAgo(w.ago)}
                        />
                    ))}
                </View>
                <Text className="text-[13px] text-ink-3">
                    {WHEN_FMT.format(new Date(Date.now() - ago))}
                </Text>
            </SheetField>

            <SheetField label="Duration">
                <View className="flex-row flex-wrap gap-2">
                    {DURATIONS.map((d) => (
                        <Choice
                            key={d}
                            label={`${d}`}
                            selected={duration === String(d)}
                            onPress={() => setDuration(String(d))}
                        />
                    ))}
                </View>
                <View className="flex-row items-center gap-2.5">
                    <Input
                        keyboardType="number-pad"
                        value={duration}
                        onChangeText={setDuration}
                        placeholder="Or enter minutes"
                        className="flex-1"
                    />
                    <Text className="text-[17px] text-ink-3">min</Text>
                </View>
            </SheetField>

            <SheetField label="Calories (optional)">
                <View className="flex-row items-center gap-2.5">
                    <Input
                        keyboardType="number-pad"
                        value={calories}
                        onChangeText={setCalories}
                        placeholder="Skip if you don't know"
                        className="flex-1"
                    />
                    <Text className="text-[17px] text-ink-3">kcal</Text>
                </View>
            </SheetField>

            {errors.length > 0 && <ErrorList errors={errors} />}
        </Sheet>
    )
}
