// Competition detail — standings and shared goals for one competition. Its
// name, members and join code are managed on the settings screen pushed from here.
//
// The web reads the active competition from a ?c= query param and falls back to
// the first one in the sidebar; here the id is a real route segment, so the
// screen always has an explicit subject.

import { useCallback, useEffect, useRef, useState } from "react"
import { Share, Text, View } from "react-native"
import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useAtomValue } from "jotai"
import {
    ApiError,
    type CompetitionDetail,
    getCompetition,
    useApi
} from "@shared/index"
import { userAtom } from "../../../../auth"
import { buildColorMap } from "../../../../features/competition/colors"
import { CompetitionBoard } from "../../../../features/competition/components/CompetitionBoard"
import { BackBar } from "../../../../ui/BackBar"
import { CircleButton } from "../../../../ui/CircleButton"
import { Screen } from "../../../../ui/Screen"
import { GearIcon } from "../../../../ui/icons"
import { Card, Display, ErrorList, Mono } from "../../../../ui/primitives"
import { colors as theme } from "../../../../theme"

function messageFor(err: unknown): string {
    if (err instanceof ApiError) return err.messages.join(", ")
    if (err instanceof Error) return err.message
    return "Something went wrong"
}

export default function Competition() {
    const api = useApi()
    const { id } = useLocalSearchParams<{ id: string }>()
    const user = useAtomValue(userAtom)

    const [detail, setDetail] = useState<CompetitionDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [tick, setTick] = useState(0)
    const [error, setError] = useState<string | null>(null)

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

    const isOwner = detail?.ownerID === user?.userID

    const colors = detail
        ? buildColorMap(detail.members)
        : {}

    /** Hand the join code to the share sheet, ready to send. */
    function shareJoinCode() {
        if (!detail) return
        void Share.share({
            message: `Join "${detail.name}" on Beacc with code ${detail.joinCode}`
        }).catch(() => {})
    }

    return (
        <Screen
            edges={["top", "bottom"]}
            topRight={
                detail ? (
                    <View className="flex-row gap-2.5">
                        <CircleButton
                            pill
                            label={`Share join code ${detail.joinCode}`}
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
                ) : undefined
            }
        >
            <BackBar label="Competitions" />

            {error !== null && <ErrorList errors={[error]} />}

            {detail ? (
                <>
                    <Display size={32}>{detail.name}</Display>

                    <CompetitionBoard
                        competition={detail}
                        isOwner={isOwner}
                        meID={user?.userID}
                        colors={colors}
                        refreshKey={tick}
                        onChanged={() => setTick((t) => t + 1)}
                    />
                </>
            ) : (
                <Card className="p-5">
                    <Text className="text-[13px] text-ink-3">
                        {loading ? "Loading…" : "Competition not found."}
                    </Text>
                </Card>
            )}
        </Screen>
    )
}
