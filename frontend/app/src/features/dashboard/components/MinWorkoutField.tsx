// The "Minimum length" field shared by the goal creation and edit sheets.

import { Text, View } from "react-native"
import { SheetField } from "../../../ui/Sheet"
import { ChoiceButton } from "../../../ui/primitives"

/** Minimum workout lengths offered for a workouts goal, in minutes; null is any length. */
const CHOICES: (number | null)[] = [null, 15, 20, 30, 45, 60]

/** Whether a goal on this metric can have a minimum workout length. */
export function takesMinWorkout(integration: string, metric: string): boolean {
    return integration === "apple_fitness" && metric === "workouts"
}

export function MinWorkoutField({
    value,
    onChange
}: {
    value: number | null
    onChange: (minutes: number | null) => void
}) {
    return (
        <SheetField label="Minimum length">
            <View className="flex-row flex-wrap gap-2">
                {CHOICES.map((m) => (
                    <ChoiceButton
                        key={m ?? "any"}
                        selected={value === m}
                        onPress={() => onChange(m)}
                    >
                        <Text className="text-center text-[16px] font-semibold text-ink">
                            {m === null ? "Any" : `${m} min`}
                        </Text>
                    </ChoiceButton>
                ))}
            </View>
            <Text className="text-[13px] text-ink-3">
                {value === null
                    ? "Every workout counts."
                    : `Only workouts of ${value} minutes or more count.`}
            </Text>
        </SheetField>
    )
}
