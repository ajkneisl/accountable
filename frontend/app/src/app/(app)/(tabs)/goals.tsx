// Goals — the goal streak and every goal with its progress for the week, followed by the
// goals of the user's competitions, grouped under a heading per competition that opens it.
// One week heading above the cards picks the week for all of them.
// Data comes from the AppDataProvider mounted above the tabs.
// The pencil in the top right toggles edit mode, which gives each of the user's own goals an
// Edit button; the New goal card is always under them. Competition goals are edited from their
// competition, so in edit mode the heading of one the user owns leads there instead.

import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Host, Image } from "@expo/ui/swift-ui"
import { router } from "expo-router"
import { useAtomValue } from "jotai"
import type { Goal, GoalCompetition } from "@shared/index"
import { userAtom } from "../../../auth"
import { useAppData } from "../../../features/common/AppData"
import { GoalCard } from "../../../features/dashboard/components/GoalCard"
import { StreakSection } from "../../../features/dashboard/components/StreaksCard"
import {
    formatWeekRange,
    goalKey,
    localWeekStart
} from "../../../features/dashboard/types"
import { EmptyState } from "../../../ui/EmptyState"
import { EditModeButton } from "../../../ui/EditModeButton"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import { WeekHeading } from "../../../ui/WeekHeading"
import { ChevronIcon } from "../../../ui/icons"
import { AddCard, Card, PageTitle, Spinner } from "../../../ui/primitives"
import { useColors } from "../../../theme"

/** Competition goals gathered by competition, in the order they arrive. */
function byCompetition(
    goals: Goal[]
): { competition: GoalCompetition; goals: Goal[] }[] {
    const groups = new Map<
        string,
        { competition: GoalCompetition; goals: Goal[] }
    >()
    for (const goal of goals) {
        if (!goal.competition) continue
        const group = groups.get(goal.competition.id)
        if (group) group.goals.push(goal)
        else
            groups.set(goal.competition.id, {
                competition: goal.competition,
                goals: [goal]
            })
    }
    return [...groups.values()]
}

/**
 * Heading over a competition's goals: the Competitions tab's trophy and the
 * competition's name, and the whole row opens it. With [edit] — edit mode, on
 * a competition the user owns — it opens the competition's goals ready to edit.
 */
function CompetitionHeading({
    competition,
    edit
}: {
    competition: GoalCompetition
    edit: boolean
}) {
    const colors = useColors()
    const action = edit ? "Edit in Competition" : "Open"
    return (
        <Pressable
            accessibilityRole="link"
            accessibilityLabel={
                edit
                    ? `Edit goals in competition ${competition.name}`
                    : `Open competition ${competition.name}`
            }
            onPress={() =>
                router.push({
                    pathname: "/competition/[id]",
                    params: edit
                        ? { id: competition.id, edit: "1" }
                        : { id: competition.id }
                })
            }
            hitSlop={8}
            className="flex-row items-center gap-2 px-1 active:opacity-60"
        >
            <Host matchContents>
                <Image systemName="trophy.fill" size={15} color={colors.ink3} />
            </Host>
            <Text
                numberOfLines={1}
                className="flex-1 text-[17px] font-semibold tracking-tight text-ink"
            >
                {competition.name}
            </Text>
            <Text
                className={`text-[13px] font-medium ${
                    edit ? "text-ink" : "text-ink-3"
                }`}
            >
                {action}
            </Text>
            <ChevronIcon color={colors.ink3} size={16} />
        </Pressable>
    )
}

export default function Goals() {
    const { data, loading, error, reload, openNewGoal, openEditGoal } =
        useAppData()
    const goals = data.goals
    const competitionGoals = data.competitionGoals
    const allGoals = [...goals, ...competitionGoals]
    const user = useAtomValue(userAtom)
    const groups = byCompetition(competitionGoals)
    // Competitions whose goals the user can change, from their own goals page.
    const owned = new Set(
        data.competitions
            .filter((c) => c.ownerID === user?.userID)
            .map((c) => c.id)
    )
    const canEdit =
        goals.length > 0 || groups.some((g) => owned.has(g.competition.id))
    const [editing, setEditing] = useState(false)
    // Nothing left to edit (e.g. the last goal was just deleted): leave edit mode.
    const editMode = editing && canEdit
    // The week every card shows: 0 = this week, 1 = last week, …
    const [offset, setOffset] = useState(0)

    return (
        <Screen
            refreshing={loading}
            onRefresh={reload}
            topRight={
                <View className="flex-row gap-2.5">
                    {canEdit && (
                        <EditModeButton
                            editing={editMode}
                            noun="goals"
                            onChange={setEditing}
                        />
                    )}
                    <SettingsButton />
                </View>
            }
        >
            <PageTitle>Goals</PageTitle>

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
                <Card className="p-4">
                    <StreakSection
                        streak={data.streak}
                        history={data.history}
                    />
                </Card>
            )}

            {allGoals.length > 0 && (
                <WeekHeading
                    current={offset === 0}
                    range={formatWeekRange(localWeekStart(offset))}
                    onBack={() => setOffset((o) => o + 1)}
                    onForward={() => setOffset((o) => Math.max(0, o - 1))}
                />
            )}

            {goals.map((g) => (
                <GoalCard
                    key={goalKey(g)}
                    goal={g}
                    offset={offset}
                    onEdit={
                        editMode ? () => openEditGoal(goalKey(g)) : undefined
                    }
                />
            ))}

            {/* An empty page has its own New goal button. */}
            {allGoals.length > 0 && (
                <AddCard label="New goal" onPress={openNewGoal} />
            )}

            {groups.map(({ competition, goals }) => (
                <View key={competition.id} className="mt-2 gap-3">
                    <CompetitionHeading
                        competition={competition}
                        edit={editMode && owned.has(competition.id)}
                    />
                    <View className="gap-5">
                        {goals.map((g) => (
                            <GoalCard
                                key={goalKey(g)}
                                goal={g}
                                offset={offset}
                            />
                        ))}
                    </View>
                </View>
            ))}
        </Screen>
    )
}
