// The "Days" field on a daily goal's creation and edit sheets.

import { Pressable, Text, View } from "react-native"
import { EVERY_DAY, requiredDaysLabel } from "@shared/index"
import { SheetField } from "../../../ui/Sheet"
import { ChoiceButton } from "../../../ui/primitives"

const WEEKDAY = ["M", "T", "W", "T", "F", "S", "S"]
const WEEKDAY_NAME = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]

const PRESETS = [
    { label: "Every day", days: EVERY_DAY },
    { label: "Weekdays", days: [0, 1, 2, 3, 4] },
    { label: "Mon, Wed, Fri", days: [0, 2, 4] }
]

export function RequiredDaysField({
    value,
    onChange
}: {
    /** Sorted, 0 = Monday. */
    value: number[]
    onChange: (days: number[]) => void
}) {
    function toggle(day: number) {
        if (!value.includes(day)) {
            onChange([...value, day].sort((a, b) => a - b))
        } else if (value.length > 1) {
            // A goal has to be due at least once a week.
            onChange(value.filter((d) => d !== day))
        }
    }

    return (
        <SheetField label="Days">
            <View className="flex-row flex-wrap gap-2">
                {PRESETS.map((p) => (
                    <ChoiceButton
                        key={p.label}
                        selected={p.days.join() === value.join()}
                        onPress={() => onChange(p.days)}
                    >
                        <Text className="text-center text-[16px] font-semibold text-ink">
                            {p.label}
                        </Text>
                    </ChoiceButton>
                ))}
            </View>
            <View className="flex-row gap-1.5">
                {WEEKDAY.map((d, i) => {
                    const selected = value.includes(i)
                    return (
                        <Pressable
                            key={i}
                            onPress={() => toggle(i)}
                            accessibilityRole="button"
                            accessibilityLabel={WEEKDAY_NAME[i]}
                            accessibilityState={{ selected }}
                            className={`h-11 flex-1 items-center justify-center rounded-[14px] border-[1.5px] ${
                                selected
                                    ? "border-ink bg-bg-sunken"
                                    : "border-line bg-bg-card"
                            }`}
                        >
                            <Text
                                className={`text-[16px] font-semibold ${
                                    selected ? "text-ink" : "text-ink-3"
                                }`}
                            >
                                {d}
                            </Text>
                        </Pressable>
                    )
                })}
            </View>
            <Text className="text-[13px] text-ink-3">
                {value.length === 7
                    ? "Required every day."
                    : `${requiredDaysLabel(value)} only. Other days don't affect your streak.`}
            </Text>
        </SheetField>
    )
}
