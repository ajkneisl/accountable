// A competition's all-time leaderboard page: how many completed weeks each
// member has finished first in the standings. The server does the counting,
// since it spans every week since the competition began.

import { useEffect, useState } from "react"
import { Text } from "react-native"
import {
    type CompetitionLeaderboard,
    getCompetitionLeaderboard,
    useApi
} from "@shared/index"
import { useColors } from "../../../theme"
import { Bar, Card, Mono } from "../../../ui/primitives"
import { FALLBACK_BAR_COLOR } from "../colors"
import { MemberRow } from "./MemberRow"

export function LeaderboardPage({
    competitionId,
    meID,
    colors: colorMap,
    refreshKey = 0
}: {
    competitionId: string
    meID?: string
    colors: Record<string, string>
    /** Bump to refetch — e.g. after a shared goal changes, which rescores every week. */
    refreshKey?: number
}) {
    const api = useApi()
    const colors = useColors()
    const [board, setBoard] = useState<CompetitionLeaderboard | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getCompetitionLeaderboard(api, competitionId)
            .then((b) => {
                if (!cancelled) setBoard(b)
            })
            .catch(() => {
                if (!cancelled) setBoard(null)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [api, competitionId, refreshKey])

    if (!board)
        return (
            <Card className="p-5">
                <Text className="text-[13px] text-ink-3">
                    {loading ? "Loading…" : "Couldn't load the leaderboard."}
                </Text>
            </Card>
        )

    return (
        <Card className="overflow-hidden">
            {board.members.map((m, i) => {
                const isMe = m.userID === meID
                return (
                    <MemberRow
                        key={m.userID}
                        // Members level on weeks share a rank.
                        rank={
                            1 +
                            board.members.filter((o) => o.weeksWon > m.weeksWon)
                                .length
                        }
                        color={colorMap[m.userID] ?? FALLBACK_BAR_COLOR}
                        username={m.username}
                        isMe={isMe}
                        divided={i > 0}
                        value={
                            <Mono className="text-[14px] text-ink-3">
                                <Text className="font-bold text-ink">
                                    {m.weeksWon}
                                </Text>
                                {m.weeksWon === 1 ? " wk" : " wks"}
                            </Mono>
                        }
                    >
                        {/* Their share of the weeks counted. */}
                        <Bar
                            pct={
                                board.weeks > 0
                                    ? (m.weeksWon / board.weeks) * 100
                                    : 0
                            }
                            color={colorMap[m.userID] ?? FALLBACK_BAR_COLOR}
                            // The highlighted row is already the track color.
                            track={isMe ? colors.line : undefined}
                            height={8}
                        />
                    </MemberRow>
                )
            })}
        </Card>
    )
}
