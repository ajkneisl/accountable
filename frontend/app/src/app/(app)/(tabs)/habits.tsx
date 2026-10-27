// Habits — custom daily habits with a heatmap each. State lives in
// HabitsProvider (mounted above the tabs) so the widget stays fresh. The pencil
// in the top right toggles edit mode, which gives each habit an Edit button.

import { useState } from "react"
import { Text, View } from "react-native"
import { HabitCard } from "../../../features/habits/components/HabitCard"
import { useHabits } from "../../../features/habits/HabitsData"
import { EditModeButton } from "../../../ui/EditModeButton"
import { EmptyState } from "../../../ui/EmptyState"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import { AddCard, Card, Display, Spinner } from "../../../ui/primitives"

export default function Habits() {
    const {
        data,
        loading,
        error,
        reload,
        toggle,
        openNewHabit,
        openEditHabit
    } = useHabits()
    const habits = data?.habits ?? []
    const [editing, setEditing] = useState(false)
    // Nothing left to edit (e.g. the last habit was just deleted): leave edit mode.
    const editMode = editing && habits.length > 0

    return (
        <Screen
            refreshing={loading && data !== null}
            onRefresh={reload}
            topRight={
                <View className="flex-row gap-2.5">
                    {habits.length > 0 && (
                        <EditModeButton
                            editing={editMode}
                            noun="habits"
                            onChange={setEditing}
                        />
                    )}
                    <SettingsButton />
                </View>
            }
        >
            <View className="gap-1.5 pr-24">
                <Display size={32}>Habits</Display>
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
                <EmptyState
                    framed
                    title="No habits yet"
                    action={{ label: "New habit", onPress: openNewHabit }}
                />
            )}

            {data !== null &&
                habits.map((habit) => (
                    <HabitCard
                        key={habit.id}
                        habit={habit}
                        start={data.start}
                        today={data.today}
                        onToggle={(date, done) => toggle(habit.id, date, done)}
                        onEdit={
                            editMode ? () => openEditHabit(habit.id) : undefined
                        }
                    />
                ))}

            {data !== null && habits.length > 0 && (
                <AddCard label="New habit" onPress={openNewHabit} />
            )}
        </Screen>
    )
}
