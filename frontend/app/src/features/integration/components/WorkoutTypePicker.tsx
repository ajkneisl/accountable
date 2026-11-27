// The workout type as a wrap of chips. iOS uses a SwiftUI menu picker instead
// (see WorkoutTypePicker.ios.tsx).

import { Text, View } from "react-native"
import type { WorkoutType } from "@shared/index"
import { ChoiceButton } from "../../../ui/primitives"
import { WORKOUT_LABEL } from "./WorkoutCard"

export const WORKOUT_TYPES = Object.entries(WORKOUT_LABEL).map(
    ([value, label]) => ({ value: value as WorkoutType, label })
)

export type WorkoutTypePickerProps = {
    value: WorkoutType
    onChange: (type: WorkoutType) => void
}

export function WorkoutTypePicker({ value, onChange }: WorkoutTypePickerProps) {
    return (
        <View className="flex-row flex-wrap gap-2">
            {WORKOUT_TYPES.map((t) => (
                <ChoiceButton
                    key={t.value}
                    selected={value === t.value}
                    onPress={() => onChange(t.value)}
                    className="px-3.5 py-2.5"
                >
                    <Text className="text-[15px] font-semibold text-ink">
                        {t.label}
                    </Text>
                </ChoiceButton>
            ))}
        </View>
    )
}
