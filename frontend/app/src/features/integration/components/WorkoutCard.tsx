// Workout card — today's workouts, marking the ones logged by hand, with manual
// entry + delete.

import { Pressable, Text, View } from "react-native"
import {
    deleteWorkout,
    useApi,
    type Workout,
    type WorkoutType
} from "@shared/index"
import { confirm } from "../../../ui/confirm"
import {
    Button,
    Card,
    Eyebrow,
    IntegrationIcon,
    SourceTile,
    Spinner
} from "../../../ui/primitives"

export const WORKOUT_LABEL: Record<WorkoutType, string> = {
    RUN: "Run",
    WEIGHTLIFTING: "Weightlifting",
    BASKETBALL: "Basketball",
    PICKLEBALL: "Pickleball",
    OTHER: "Other"
}

const TIME_FMT = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
})

export function WorkoutCard({
    workouts,
    onAdd,
    onChanged,
    loading = false
}: {
    workouts: Workout[]
    onAdd: () => void
    onChanged: () => void
    loading?: boolean
}) {
    const api = useApi()
    const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0)
    const totalMinutes = workouts.reduce((sum, w) => sum + w.durationMin, 0)

    async function remove(workout: Workout) {
        const ok = await confirm(
            `Remove ${WORKOUT_LABEL[workout.type]}?`,
            "It'll also come off your goals and the feed, along with any likes.",
            "Remove",
            true
        )
        if (!ok) return
        try {
            await deleteWorkout(api, workout.id)
            onChanged()
        } catch {
            // ignore; UI stays as-is, user can retry
        }
    }

    return (
        <Card className="p-5">
            <View className="mb-4 flex-row items-start gap-3">
                <SourceTile
                    label="WO"
                    icon={<IntegrationIcon name="apple_fitness" />}
                />
                <View className="flex-1">
                    <View className="mb-1.5 flex-row items-center gap-2">
                        <Eyebrow>Today's workouts</Eyebrow>
                        {loading && <Spinner />}
                    </View>
                    <Text className="text-[20px] font-semibold tracking-tight text-ink">
                        {totalCalories.toLocaleString()} kcal
                    </Text>
                    <Text className="text-[13px] text-ink-3">
                        {workouts.length}{" "}
                        {workouts.length === 1 ? "workout" : "workouts"} ·{" "}
                        {totalMinutes} min
                    </Text>
                </View>
            </View>

            <View className="mb-4 flex-row items-center gap-3">
                <Button label="+ Add workout" size="sm" onPress={onAdd} />
                <Text className="flex-1 text-[11px] leading-[15px] text-ink-3">
                    Workouts sync from Apple Health. Add any it missed.
                </Text>
            </View>

            {workouts.length === 0 ? (
                <View className="rounded-[10px] border border-line p-4">
                    <Text className="text-center text-[13px] text-ink-3">
                        No workouts logged yet today.
                    </Text>
                </View>
            ) : (
                <View className="gap-2">
                    {workouts.map((w) => (
                        <View
                            key={w.id}
                            className="flex-row items-center gap-3 rounded-[10px] border border-line bg-bg-card px-3.5 py-2.5"
                        >
                            <View className="flex-1">
                                <Text className="text-[14px] font-semibold text-ink">
                                    {WORKOUT_LABEL[w.type]}
                                </Text>
                                <Text className="text-[11px] text-ink-3">
                                    {[
                                        TIME_FMT.format(new Date(w.happenedAt)),
                                        `${w.durationMin} min`,
                                        ...(w.calories > 0
                                            ? [
                                                  `${w.calories.toLocaleString()} kcal`
                                              ]
                                            : []),
                                        ...(w.source === "MANUAL"
                                            ? ["Manual"]
                                            : [])
                                    ].join(" · ")}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => void remove(w)}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${WORKOUT_LABEL[w.type]} workout`}
                                hitSlop={10}
                                className="h-7 w-7 items-center justify-center rounded-full"
                            >
                                <Text className="text-base text-ink-3">×</Text>
                            </Pressable>
                        </View>
                    ))}
                </View>
            )}
        </Card>
    )
}
