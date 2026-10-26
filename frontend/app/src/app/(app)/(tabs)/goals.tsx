// Goals — the goal streak and every goal with its progress for the week, followed by the
// goals of the user's competitions. Data comes from the AppDataProvider mounted above the tabs.

import { Text, View } from "react-native"
import { useAppData } from "../../../features/common/AppData"
import { GoalCard } from "../../../features/dashboard/components/GoalCard"
import { StreakSection } from "../../../features/dashboard/components/StreaksCard"
import { goalKey } from "../../../features/dashboard/types"
import { EmptyState } from "../../../ui/EmptyState"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import {
    AddCard,
    Card,
    Display,
    Eyebrow,
    Spinner
} from "../../../ui/primitives"

export default function Goals() {
    const { data, loading, error, reload, openNewGoal, openEditGoal } =
        useAppData()
    const goals = data.goals
    const competitionGoals = data.competitionGoals
    const allGoals = [...goals, ...competitionGoals]

    return (
        <Screen
            refreshing={loading}
            onRefresh={reload}
            topRight={<SettingsButton />}
        >
            <View className="gap-1.5 pr-12">
                <Display size={32}>Goals</Display>
            </View>

            {error !== null && (
                <Card className="bg-coral-soft p-4">
                    <Text className="text-[13px] text-coral-ink">{error}</Text>
                </Card>
            )}

            {allGoals.length === 0 && loading && (
                <View className="items-center py-10">
                    <Spinner size={32} />
                </View>
            )}

            {allGoals.length === 0 && !loading && error === null && (
                <EmptyState
                    framed
                    title="No goals yet"
                    action={{ label: "New goal", onPress: openNewGoal }}
                />
            )}

            {goals.length > 0 && (
                <Card className="p-5">
                    <Eyebrow className="mb-3.5">Streak</Eyebrow>
                    <StreakSection
                        streak={data.streak}
                        history={data.history}
                    />
                </Card>
            )}

            {goals.map((g) => (
                <GoalCard
                    key={goalKey(g)}
                    goal={g}
                    onEdit={() => openEditGoal(goalKey(g))}
                />
            ))}

            {allGoals.length > 0 && (
                <AddCard label="New goal" onPress={openNewGoal} />
            )}

            {competitionGoals.map((g) => (
                <GoalCard
                    key={goalKey(g)}
                    goal={g}
                />
            ))}
        </Screen>
    )
}
