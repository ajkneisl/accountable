// Competitions tab — every competition the user belongs to, each with where
// they stand in it this week, plus create/join.
// Merges the web's sidebar competition list with its AllCompetitions page.

import { useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import { useAtom, useAtomValue } from "jotai"
import type { CompetitionSummary } from "@shared/index"
import { userAtom } from "../../../auth"
import { EmptyState } from "../../../ui/EmptyState"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import { AddCard, Card, Chip, PageTitle } from "../../../ui/primitives"
import { useAppData } from "../../../features/common/AppData"
import { CompetitionIcon } from "../../../features/competition/components/CompetitionIcon"
import { CompetitionSheet } from "../../../features/competition/components/CompetitionSheet"
import { pendingJoinCodeAtom } from "../../../features/competition/pendingJoin"
import {
    type CompetitionRank,
    useCompetitionRanks
} from "../../../features/competition/useCompetitionRanks"

/** "1st", "2nd", "3rd", "11th". */
function ordinal(n: number): string {
    const tens = n % 100
    if (tens >= 11 && tens <= 13) return `${n}th`
    return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`
}

/** "2nd of 5" once someone's ranked, otherwise how many are in it. */
function standing({ rank, members }: CompetitionRank): string {
    if (rank !== null) return `${ordinal(rank)} of ${members}`
    return `${members} ${members === 1 ? "member" : "members"}`
}

export default function Competitions() {
    const { data, loading, reload } = useAppData()
    const user = useAtomValue(userAtom)
    const [sheetOpen, setSheetOpen] = useState(false)
    const [joinCode, setJoinCode] = useState<string | null>(null)
    const [pendingCode, setPendingCode] = useAtom(pendingJoinCodeAtom)

    // A join link opens the sheet on the Join tab with its code filled in.
    useEffect(() => {
        if (!pendingCode) return
        setJoinCode(pendingCode)
        setSheetOpen(true)
        setPendingCode(null)
    }, [pendingCode, setPendingCode])

    function closeSheet() {
        setSheetOpen(false)
        setJoinCode(null)
    }

    // In the server's order: most recently joined first.
    const competitions = data.competitions
    const meID = user?.userID
    const ranks = useCompetitionRanks(competitions, meID)

    return (
        <Screen
            refreshing={loading}
            onRefresh={reload}
            topRight={<SettingsButton />}
        >
            <PageTitle>Competitions</PageTitle>

            {competitions.length === 0 ? (
                loading ? (
                    <Card className="p-5">
                        <Text className="text-[13px] text-ink-3">Loading…</Text>
                    </Card>
                ) : (
                    <EmptyState
                        framed
                        title="No competitions yet"
                        action={{
                            label: "Create or join",
                            onPress: () => setSheetOpen(true)
                        }}
                    />
                )
            ) : (
                <View className="gap-3">
                    {competitions.map((c) => (
                        <CompetitionRow
                            key={c.id}
                            competition={c}
                            owned={c.ownerID === meID}
                            rank={ranks[c.id]}
                        />
                    ))}
                </View>
            )}

            {competitions.length > 0 && (
                <AddCard
                    label="Create or join competition"
                    onPress={() => setSheetOpen(true)}
                />
            )}

            {sheetOpen && (
                <CompetitionSheet
                    key={joinCode ?? "new"}
                    initialMode={joinCode ? "join" : "create"}
                    initialCode={joinCode ?? undefined}
                    onClose={closeSheet}
                    onDone={(id) => {
                        closeSheet()
                        reload()
                        router.push({
                            pathname: "/competition/[id]",
                            params: { id }
                        })
                    }}
                />
            )}
        </Screen>
    )
}

function CompetitionRow({
    competition: c,
    owned,
    rank
}: {
    competition: CompetitionSummary
    owned: boolean
    /** Where the user stands in it; absent until it has loaded. */
    rank?: CompetitionRank
}) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={() =>
                router.push({
                    pathname: "/competition/[id]",
                    params: { id: c.id }
                })
            }
        >
            <Card className="flex-row items-center gap-3 p-4">
                <CompetitionIcon name={c.name} />
                <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                        <Text
                            numberOfLines={1}
                            className="shrink text-[16px] font-semibold tracking-tight text-ink"
                        >
                            {c.name}
                        </Text>
                        {owned && (
                            <Chip>
                                <Text className="text-[11px] font-semibold text-ink-2">
                                    Owner
                                </Text>
                            </Chip>
                        )}
                    </View>
                    {rank && (
                        <Text className="text-[13px] text-ink-3">
                            {standing(rank)}
                        </Text>
                    )}
                </View>
                <Text className="text-base text-ink-3">›</Text>
            </Card>
        </Pressable>
    )
}
