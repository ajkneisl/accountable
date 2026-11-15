// Competition detail — one competition, split over three pages with their own
// bottom bar: this week's standings, the all-time leaderboard (weeks finished
// first), and the shared goals. Swipe or tap the bar to move between them. Its
// name, members and join code are managed on the settings screen pushed from here.
//
// The top right shares the join code, except for the owner on the goals page,
// where a pencil takes its place: edit mode, for changing and adding shared goals.
//
// The web reads the active competition from a ?c= query param and falls back to
// the first one in the sidebar; here the id is a real route segment, so the
// screen always has an explicit subject.

import { useCallback, useEffect, useRef, useState } from "react"
import { Share, Text, View } from "react-native"
import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useAtomValue } from "jotai"
import { SafeAreaView } from "react-native-safe-area-context"
import {
    ApiError,
    type CompetitionDetail,
    getCompetition,
    useApi
} from "@shared/index"
import { userAtom } from "../../../../auth"
import { buildColorMap } from "../../../../features/competition/colors"
import { AddCompetitionGoalSheet } from "../../../../features/competition/components/AddCompetitionGoalSheet"
import {
    GoalsPage,
    StandingsPage,
    useCompetitionWeek
} from "../../../../features/competition/components/CompetitionBoard"
import { LeaderboardPage } from "../../../../features/competition/components/LeaderboardPage"
import { joinLink } from "../../../../features/competition/pendingJoin"
import { BackBar } from "../../../../ui/BackBar"
import { CircleButton } from "../../../../ui/CircleButton"
import { EditModeButton } from "../../../../ui/EditModeButton"
import { SwipePages } from "../../../../ui/SwipePages"
import { GearIcon } from "../../../../ui/icons"
import { Card, Display, ErrorList, Mono } from "../../../../ui/primitives"
import { useColors, useScheme } from "../../../../theme"

function messageFor(err: unknown): string {
    if (err instanceof ApiError) return err.messages.join(", ")
    if (err instanceof Error) return err.message
    return "Something went wrong"
}

/** Where the goals page sits among the pages below. */
const GOALS_PAGE = 2

export default function Competition() {
    const api = useApi()
    const theme = useColors()
    const scheme = useScheme()
    const { id } = useLocalSearchParams<{ id: string }>()
    const user = useAtomValue(userAtom)

    const [detail, setDetail] = useState<CompetitionDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [tick, setTick] = useState(0)
    const [adding, setAdding] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(0)
    const [editing, setEditing] = useState(false)

    // Refetch on coming back from settings, which may have renamed it or
    // changed its members. The first focus is the initial load below.
    const focused = useRef(false)
    useFocusEffect(
        useCallback(() => {
            if (focused.current) setTick((t) => t + 1)
            focused.current = true
        }, [])
    )

    useEffect(() => {
        if (!id) return
        let cancelled = false
        setLoading(true)
        getCompetition(api, id)
            .then((d) => {
                if (!cancelled) setDetail(d)
            })
            .catch((err) => {
                if (!cancelled) setError(messageFor(err))
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [api, id, tick])

    // The week the standings and the shared goals both show.
    const week = useCompetitionWeek(id, tick)

    const isOwner = detail?.ownerID === user?.userID
    // The pencil only shows where there's something for it to edit.
    const canEdit =
        isOwner && page === GOALS_PAGE && (detail?.goals.length ?? 0) > 0
    const editMode = editing && canEdit

    const colors = detail ? buildColorMap(detail.members, scheme) : {}

    /** Hand a join link to the share sheet; it opens the join sheet in Beacc. */
    function shareJoinCode() {
        if (!detail) return
        void Share.share({
            message: `Join "${detail.name}" on Beacc: ${joinLink(detail.joinCode)}`
        }).catch(() => {})
    }

    return (
        <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
            {/* Stays put above the pages, so the competition keeps its name
                and controls while they slide underneath. */}
            <View className="gap-5 px-5 pt-4">
                <BackBar label="Competitions" />

                {error !== null && <ErrorList errors={[error]} />}

                {detail && <Display size={32}>{detail.name}</Display>}

                {detail && (
                    <View className="absolute right-5 top-3 flex-row gap-2.5">
                        {canEdit ? (
                            <EditModeButton
                                editing={editMode}
                                noun="shared goals"
                                onChange={setEditing}
                            />
                        ) : (
                            <CircleButton
                                pill
                                label={`Share join link for code ${detail.joinCode}`}
                                onPress={shareJoinCode}
                            >
                                {() => (
                                    <>
                                        <Text className="mr-1.5 text-[13px] text-ink-3">
                                            #
                                        </Text>
                                        <Mono
                                            style={{ letterSpacing: 2 }}
                                            className="text-[16px] font-bold text-ink"
                                        >
                                            {detail.joinCode}
                                        </Mono>
                                    </>
                                )}
                            </CircleButton>
                        )}
                        <CircleButton
                            label="Competition settings"
                            onPress={() =>
                                router.push({
                                    pathname: "/competition/[id]/settings",
                                    params: { id: detail.id }
                                })
                            }
                        >
                            {(glass) =>
                                glass ? (
                                    <GearIcon color={theme.ink} size={21} />
                                ) : (
                                    <GearIcon color={theme.ink2} size={20} />
                                )
                            }
                        </CircleButton>
                    </View>
                )}
            </View>

            {detail ? (
                <SwipePages
                    onPageChange={(next) => {
                        setPage(next)
                        // Edit mode ends on leaving the goals page.
                        if (next !== GOALS_PAGE) setEditing(false)
                    }}
                    pages={[
                        {
                            label: "Standings",
                            sf: "list.number",
                            content: (
                                <StandingsPage
                                    competition={detail}
                                    view={week}
                                    isOwner={isOwner}
                                    meID={user?.userID}
                                    colors={colors}
                                />
                            )
                        },
                        {
                            label: "Leaderboard",
                            sf: "crown.fill",
                            content: (
                                <LeaderboardPage
                                    competitionId={detail.id}
                                    meID={user?.userID}
                                    colors={colors}
                                    refreshKey={tick}
                                />
                            )
                        },
                        {
                            label: "Goals",
                            sf: "target",
                            content: (
                                <GoalsPage
                                    competition={detail}
                                    view={week}
                                    editMode={editMode}
                                    onAdd={
                                        isOwner
                                            ? () => setAdding(true)
                                            : undefined
                                    }
                                    meID={user?.userID}
                                    colors={colors}
                                    onChanged={() => setTick((t) => t + 1)}
                                />
                            )
                        }
                    ]}
                />
            ) : (
                <View className="px-5 pt-5">
                    <Card className="p-5">
                        <Text className="text-[13px] text-ink-3">
                            {loading ? "Loading…" : "Competition not found."}
                        </Text>
                    </Card>
                </View>
            )}

            {adding && detail && (
                <AddCompetitionGoalSheet
                    competitionId={detail.id}
                    onClose={() => setAdding(false)}
                    onAdded={() => setTick((t) => t + 1)}
                />
            )}
        </SafeAreaView>
    )
}
