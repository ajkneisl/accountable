// Goals — every goal with its progress for the week. Data comes from the
// AppDataProvider mounted above the tabs.

import { Text, View } from "react-native"
import { useAppData } from "../../../features/common/AppData"
import { GoalCard } from "../../../features/dashboard/components/GoalCard"
import {
    goalKey,
    isOnTrack,
    isoWeekNumber
} from "../../../features/dashboard/types"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import { AddCard, Card, Display, Spinner } from "../../../ui/primitives"

export default function Goals() {
    const { data, loading, error, reload, openNewGoal } = useAppData()
    const goals = data.goals
    const onTrack = goals.filter((g) => isOnTrack(g)).length

    return (
        <Screen
            refreshing={loading}
            onRefresh={reload}
            topRight={<SettingsButton />}
        >
            <View className="gap-3">
                <Display size={32}>
                    {goals.length === 0 ? (
                        "Set your first goal."
                    ) : (
                        <>
                            {onTrack} of {goals.length} on track.{" "}
                            <Text className="text-ink-3">
                                {onTrack === goals.length
                                    ? "All good."
                                    : "Keep going."}
                            </Text>
                        </>
                    )}
                </Display>
                <Text className="text-[15px] text-ink-3">
                    Week {isoWeekNumber(new Date())}
                </Text>
            </View>

            {error !== null && (
                <Card className="bg-coral-soft p-4">
                    <Text className="text-[13px] text-coral-ink">{error}</Text>
                </Card>
            )}

            {goals.length === 0 && loading && (
                <View className="items-center py-10">
                    <Spinner size={32} />
                </View>
            )}

            {goals.length === 0 && !loading && error === null && (
                <Card className="gap-2 p-5">
                    <Text className="text-[15px] font-semibold text-ink">
                        No goals yet
                    </Text>
                    <Text className="text-[13px] text-ink-3">
                        Track commits, LeetCode problems, or workouts against a
                        daily or weekly target.
                    </Text>
                </Card>
            )}

            {goals.map((g) => (
                <GoalCard key={goalKey(g)} goal={g} />
            ))}

            {!(goals.length === 0 && loading) && (
                <AddCard label="New goal" onPress={openNewGoal} />
            )}
        </Screen>
    )
}
