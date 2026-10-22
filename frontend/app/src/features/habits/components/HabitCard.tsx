// One habit: name, streak, today's check-off, and its heatmap.

import { Text, View } from "react-native"
import type { Habit } from "@shared/index"
import { confirm } from "../../../ui/confirm"
import { Button, Card, Dot, IconButton, Mono } from "../../../ui/primitives"
import { HABIT_PALETTE } from "../grid"
import { Heatmap } from "./Heatmap"

export function HabitCard({
    habit,
    start,
    today,
    onToggle,
    onDelete
}: {
    habit: Habit
    start: string
    today: string
    onToggle: (date: string, done: boolean) => void
    onDelete: () => void
}) {
    const palette = HABIT_PALETTE[habit.color]
    const doneToday = habit.done[habit.done.length - 1] ?? false

    async function askDelete() {
        const ok = await confirm(
            "Delete habit?",
            `"${habit.name}" and its whole history will be removed.`,
            "Delete",
            true
        )
        if (ok) onDelete()
    }

    return (
        <Card className="gap-4 p-5">
            <View className="flex-row items-center gap-3">
                <Dot color={palette.fill} size={10} />
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
                <Button
                    label={doneToday ? "Done ✓" : "Mark done"}
                    size="sm"
                    variant={doneToday ? "accent" : "line"}
                    onPress={() => onToggle(today, !doneToday)}
                />
                <IconButton
                    glyph="×"
                    label="Delete habit"
                    onPress={askDelete}
                />
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
