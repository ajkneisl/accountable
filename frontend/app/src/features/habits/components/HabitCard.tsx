// One habit: name, streak, today's check-off, and its heatmap. The whole header
// row toggles today; while the Habits tab is in edit mode an Edit button opens the
// edit sheet (rename, recolor, delete).

import { Pressable, Text, View } from "react-native"
import type { Habit } from "@shared/index"
import { colors } from "../../../theme"
import { CheckIcon } from "../../../ui/icons"
import { Button, Card, Mono } from "../../../ui/primitives"
import { HABIT_PALETTE } from "../grid"
import { Heatmap } from "./Heatmap"

const CHECK = 38

export function HabitCard({
    habit,
    start,
    today,
    onToggle,
    onEdit
}: {
    habit: Habit
    start: string
    today: string
    onToggle: (date: string, done: boolean) => void
    /** Opens the edit sheet; passed only while the Habits tab is in edit mode. */
    onEdit?: () => void
}) {
    const palette = HABIT_PALETTE[habit.color]
    const doneToday = habit.done[habit.done.length - 1] ?? false
    // Dark fills need a light check to stay visible.
    const checkColor = palette.dark ? colors.bg : colors.ink

    return (
        <Card className="gap-4 p-5">
            <View className="flex-row items-center gap-3">
                <Pressable
                    onPress={() => onToggle(today, !doneToday)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: doneToday }}
                    accessibilityLabel={`${habit.name}, done today`}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    className="flex-1 flex-row items-center gap-3"
                >
                    <View
                        style={{
                            width: CHECK,
                            height: CHECK,
                            borderRadius: CHECK / 2,
                            borderWidth: 2,
                            borderColor: palette.fill,
                            backgroundColor: doneToday
                                ? palette.fill
                                : "transparent"
                        }}
                        className="items-center justify-center"
                    >
                        {doneToday && (
                            <CheckIcon color={checkColor} size={20} />
                        )}
                    </View>
                    <View className="flex-1">
                        <Text
                            numberOfLines={1}
                            className="text-[16px] font-semibold text-ink"
                        >
                            {habit.name}
                        </Text>
                        <Mono className="mt-0.5 text-[12px] text-ink-3">
                            {habit.streak === 0
                                ? "no streak yet"
                                : `${habit.streak}d streak`}
                            {` · ${habit.total} days`}
                        </Mono>
                    </View>
                </Pressable>
                {onEdit && (
                    <Button
                        label="Edit"
                        variant="line"
                        size="sm"
                        onPress={onEdit}
                    />
                )}
            </View>

            <Heatmap
                start={start}
                today={today}
                done={habit.done}
                fill={palette.fill}
                onToggle={onToggle}
            />
        </Card>
    )
}
