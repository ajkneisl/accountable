// Competition detail — standings and shared goals for one competition.
//
// The web reads the active competition from a ?c= query param and falls back to
// the first one in the sidebar; here the id is a real route segment, so the
// screen always has an explicit subject.

import { useEffect, useState } from "react"
import { Text, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useAtomValue } from "jotai"
import {
    ApiError,
    type CompetitionDetail,
    deleteCompetition,
    getCompetition,
    leaveCompetition,
    useApi
} from "@shared/index"
import { userAtom } from "../../../auth"
import { useAppData } from "../../../features/common/AppData"
import { buildColorMap } from "../../../features/competition/colors"
import { CompetitionBoard } from "../../../features/competition/components/CompetitionBoard"
import { BackBar } from "../../../ui/BackBar"
import { Screen } from "../../../ui/Screen"
import { confirm } from "../../../ui/confirm"
import {
    Button,
    Card,
    Display,
    ErrorList,
    Mono
} from "../../../ui/primitives"

function messageFor(err: unknown): string {
    if (err instanceof ApiError) return err.messages.join(", ")
    if (err instanceof Error) return err.message
    return "Something went wrong"
}

export default function Competition() {
    const api = useApi()
    const { id } = useLocalSearchParams<{ id: string }>()
    const user = useAtomValue(userAtom)
    const { reload } = useAppData()

    const [detail, setDetail] = useState<CompetitionDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [tick, setTick] = useState(0)
    const [actionBusy, setActionBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

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

    async function onLeaveOrDelete() {
        if (!detail || !user) return
        const ok = await confirm(
            isOwner ? "Delete competition" : "Leave competition",
            isOwner
                ? `Delete "${detail.name}"? This removes it for every member.`
                : `Leave "${detail.name}"?`,
            isOwner ? "Delete" : "Leave",
            true
        )
        if (!ok) return
        setActionBusy(true)
        try {
            if (isOwner) await deleteCompetition(api, detail.id)
            else await leaveCompetition(api, detail.id)
            reload()
            router.replace("/competitions")
        } catch (err) {
            setError(messageFor(err))
        } finally {
            setActionBusy(false)
        }
    }

    const colors = detail
        ? buildColorMap(detail.members.map((m) => m.userID))
        : {}

    return (
        <Screen edges={["top", "bottom"]}>
            <BackBar label="Competitions" />

            {error !== null && <ErrorList errors={[error]} />}

            {detail ? (
                <>
                    <View className="gap-2">
                        <Display size={32}>{detail.name}</Display>
                        <Text className="text-[13px] text-ink-3">
                            {detail.members.length} member
                            {detail.members.length === 1 ? "" : "s"} ·{" "}
                            {detail.goals.length} shared goal
                            {detail.goals.length === 1 ? "" : "s"}
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-3">
                        <Card className="flex-1 flex-row items-center justify-between px-4 py-2.5">
                            <Text className="text-[13px] text-ink-3">
                                Join code
                            </Text>
                            <Mono
                                style={{ letterSpacing: 2 }}
                                className="text-[18px] font-bold text-ink"
                            >
                                {detail.joinCode}
                            </Mono>
                        </Card>
                        <Button
                            label={isOwner ? "Delete" : "Leave"}
                            variant="line"
                            size="sm"
                            onPress={onLeaveOrDelete}
                            busy={actionBusy}
                        />
                    </View>

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
