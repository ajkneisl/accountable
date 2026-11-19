// One habit, laid out like a goal card: today's check-off and the name, the
// streak as the figure top right (nothing there without one), the heatmap, and
// the days done as a line under it. The check-off and name toggle today; while
// the Habits tab is in edit mode an Edit button takes the figure's place and
// opens the edit sheet (rename, recolor, delete).

import { Pressable, Text, View } from "react-native"
import { type Habit, requiredDaysLabel } from "@shared/index"
import { onFill } from "../../../theme"
import { CheckIcon } from "../../../ui/icons"
import { Button, Card, Mono } from "../../../ui/primitives"
import { useHabitPalette } from "../grid"
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
    const palette = useHabitPalette()[habit.color]
    const doneToday = habit.done[habit.done.length - 1] ?? false
    // Dark fills need a light check to stay visible.
    const checkColor = palette.dark ? onFill.dark : onFill.light
    const days = habit.requiredDays
    const schedule = days && days.length < 7 ? requiredDaysLabel(days) : null

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
                            numberOfLines={2}
                            className="text-base font-semibold tracking-tight text-ink"
                        >
                            {habit.name}
                        </Text>
                        {schedule && (
                            <Text className="text-[12px] text-ink-3">
                                {schedule}
                            </Text>
                        )}
                    </View>
                </Pressable>
                {onEdit ? (
                    <Button
                        label="Edit"
                        variant="line"
                        size="sm"
                        onPress={onEdit}
                    />
                ) : (
                    // No streak, no figure: a bare 0 would only fill the corner.
                    habit.streak > 0 && (
                        <View
                            accessible
                            accessibilityLabel={`${habit.streak}-day streak`}
                            className="items-end"
                        >
                            <Mono
                                style={{
                                    fontSize: 28,
                                    lineHeight: 30,
                                    letterSpacing: -0.8
                                }}
                                className="font-bold text-ink"
                            >
                                {habit.streak}
                            </Mono>
                            <Text className="text-[11px] text-ink-3">
                                day streak
                            </Text>
                        </View>
                    )
                )}
            </View>

            <Heatmap
                start={start}
                today={today}
                done={habit.done}
                fill={palette.fill}
                requiredDays={habit.requiredDays}
                onToggle={onToggle}
            />

            <Mono className="text-center text-[11px] text-ink-3">
                <Text className="font-bold text-ink">{habit.total}</Text>
                <Text className="text-ink">
                    {habit.total === 1 ? " day done" : " days done"}
                </Text>
            </Mono>
        </Card>
    )
}
