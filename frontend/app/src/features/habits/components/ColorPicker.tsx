// Accent swatches shared by the habit and goal sheets.

import { Text, View } from "react-native"
import type { HabitColor } from "@shared/index"
import { ChoiceButton, Dot } from "../../../ui/primitives"
import { HABIT_COLORS, HABIT_PALETTE } from "../grid"

/** Colors per row in the picker; more than this gets too cramped on a phone. */
const COLORS_PER_ROW = 4
const COLOR_ROWS = Array.from(
    { length: Math.ceil(HABIT_COLORS.length / COLORS_PER_ROW) },
    (_, i) => HABIT_COLORS.slice(i * COLORS_PER_ROW, (i + 1) * COLORS_PER_ROW)
)

export function ColorPicker({
    value,
    onChange
}: {
    value: HabitColor
    onChange: (color: HabitColor) => void
}) {
    return (
        <View className="gap-2.5">
            {COLOR_ROWS.map((row) => (
                <View key={row[0]} className="flex-row gap-2.5">
                    {row.map((c) => (
                        <ChoiceButton
                            key={c}
                            selected={value === c}
                            onPress={() => onChange(c)}
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
            ))}
        </View>
    )
}
