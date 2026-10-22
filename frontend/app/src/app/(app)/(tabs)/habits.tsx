// Habits — custom daily habits with a heatmap each. State lives in
// HabitsProvider (mounted above the tabs) so the widget stays fresh.

import { Text, View } from "react-native"
import { HabitCard } from "../../../features/habits/components/HabitCard"
import { useHabits } from "../../../features/habits/HabitsData"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import { Button, Card, Display, Spinner } from "../../../ui/primitives"

export default function Habits() {
    const { data, loading, error, reload, toggle, remove, openNewHabit } =
        useHabits()
    const habits = data?.habits ?? []
    const last = habits[0]?.done.length ?? 0
    const doneToday = habits.filter((h) => h.done[last - 1]).length

    return (
        <Screen
            refreshing={loading && data !== null}
            onRefresh={reload}
            topRight={<SettingsButton />}
        >
            <View className="gap-3">
                <Display size={32}>
                    {habits.length === 0 ? (
                        "Build something daily."
                    ) : (
                        <>
                            {doneToday} of {habits.length} done.{" "}
                            <Text className="text-ink-3">
                                {doneToday === habits.length
                                    ? "Clean sweep."
                                    : "Keep going."}
                            </Text>
                        </>
                    )}
                </Display>
                <View className="flex-row">
                    <Button
                        label="+ New habit"
                        size="sm"
                        onPress={openNewHabit}
                    />
                </View>
            </View>

            {error !== null && (
                <Card className="bg-coral-soft p-4">
                    <Text className="text-[13px] text-coral-ink">{error}</Text>
                </Card>
            )}

            {data === null && loading && (
                <View className="items-center py-10">
                    <Spinner size={32} />
                </View>
            )}

            {data !== null && habits.length === 0 && (
                <Card className="gap-2 p-5">
                    <Text className="text-[15px] font-semibold text-ink">
                        No habits yet
                    </Text>
                    <Text className="text-[13px] text-ink-3">
                        Add one, check it off each day, and add the Habits
                        widget to your home screen to keep the heatmap in sight.
                    </Text>
                </Card>
            )}

            {data !== null &&
                habits.map((habit) => (
                    <HabitCard
                        key={habit.id}
                        habit={habit}
                        start={data.start}
                        today={data.today}
                        onToggle={(date, done) => toggle(habit.id, date, done)}
                        onDelete={() => void remove(habit.id).catch(reload)}
                    />
                ))}
        </Screen>
    )
}
