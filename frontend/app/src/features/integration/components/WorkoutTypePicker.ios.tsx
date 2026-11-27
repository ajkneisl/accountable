// The workout type as a SwiftUI menu picker. Elsewhere WorkoutTypePicker.tsx
// lays the types out as chips.

import { View } from "react-native"
import { Host, Picker, Text as SwiftText } from "@expo/ui/swift-ui"
import {
    frame,
    labelsHidden,
    pickerStyle,
    tag,
    tint
} from "@expo/ui/swift-ui/modifiers"
import type { WorkoutType } from "@shared/index"
import { useColors } from "../../../theme"
import { WORKOUT_TYPES, type WorkoutTypePickerProps } from "./WorkoutTypePicker"

export function WorkoutTypePicker({ value, onChange }: WorkoutTypePickerProps) {
    const colors = useColors()
    return (
        <View className="h-[52px] justify-center rounded-[14px] border border-line bg-bg-card px-2">
            <Host matchContents={{ vertical: true }}>
                <Picker
                    label="Type"
                    selection={value}
                    onSelectionChange={(t) => onChange(t as WorkoutType)}
                    modifiers={[
                        pickerStyle("menu"),
                        labelsHidden(),
                        tint(colors.ink),
                        frame({
                            maxWidth: Infinity,
                            alignment: "leading"
                        })
                    ]}
                >
                    {WORKOUT_TYPES.map((t) => (
                        <SwiftText key={t.value} modifiers={[tag(t.value)]}>
                            {t.label}
                        </SwiftText>
                    ))}
                </Picker>
            </Host>
        </View>
    )
}
