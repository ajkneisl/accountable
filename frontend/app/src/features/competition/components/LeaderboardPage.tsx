// A competition's all-time leaderboard page: how many completed weeks each
// member has finished first in the standings. The server does the counting,
// since it spans every week since the competition began. The top three are
// picked out by their profile circles; everyone else is listed underneath.

import { useEffect, useState } from "react"
import { Text, View } from "react-native"
import {
    type CompetitionLeaderboard,
    getCompetitionLeaderboard,
    useApi
} from "@shared/index"
import { useColors, useScheme } from "../../../theme"
import { Bar, Card, Mono } from "../../../ui/primitives"
import { FALLBACK_BAR_COLOR, onMemberFill } from "../colors"
import { MemberRow } from "./MemberRow"

type Entry = CompetitionLeaderboard["members"][number]

/** How many members are picked out above the list. */
const TOP_PLACES = 3

const ORDINAL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" }

/**
 * One of the top three: their profile circle with the place they hold on its
 * lower edge, then their name and weeks. The circle is sized by rank rather
 * than by position, so members level on weeks look level.
 */
function TopPlace({
    entry,
    rank,
    color,
    isMe
}: {
    entry: Entry
    rank: number
    color: string
    isMe: boolean
}) {
    const scheme = useScheme()
    const first = rank === 1
    const size = first ? 88 : 64
    return (
        <View className="flex-1 items-center" style={{ maxWidth: 124 }}>
            <View
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color
                }}
                className="items-center justify-center"
            >
                <Text
                    style={{
                        color: onMemberFill(color, scheme),
                        fontSize: first ? 36 : 26
                    }}
                    className="font-bold"
                >
                    {(entry.username[0] ?? "?").toUpperCase()}
                </Text>
            </View>
            {/* Ringed in the card's color, so it reads against the circle. */}
            <View
                style={{ marginTop: -12 }}
                className="rounded-full border-2 border-bg-card bg-ink px-2 py-0.5"
            >
                <Text className="text-[11px] font-bold text-bg-card">
                    {ORDINAL[rank] ?? rank}
                </Text>
            </View>
            <Text
                numberOfLines={1}
                className={`mt-1.5 font-semibold text-ink ${
                    first ? "text-[17px]" : "text-[15px]"
                }`}
            >
                {entry.username}
                {isMe && (
                    <Text className="text-[11px] font-normal text-ink-3">
                        {"  you"}
                    </Text>
                )}
            </Text>
            <Mono className="text-[12px] text-ink-3">
                <Text
                    className={`font-bold text-ink ${
                        first ? "text-[22px]" : "text-[17px]"
                    }`}
                >
                    {entry.weeksWon}
                </Text>
                {entry.weeksWon === 1 ? " wk" : " wks"}
            </Mono>
        </View>
    )
}

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

    // Members level on weeks share a rank.
    const rankOf = (m: Entry) =>
        1 + board.members.filter((o) => o.weeksWon > m.weeksWon).length
    const colorOf = (m: Entry) => colorMap[m.userID] ?? FALLBACK_BAR_COLOR
    // Only members who've won a week are picked out, so nobody's up there on
    // nothing. The list arrives sorted by weeks won.
    const top = board.members
        .filter((m) => m.weeksWon > 0)
        .slice(0, TOP_PLACES)
    const rest = board.members.slice(top.length)
    // First in the middle once all three places are taken.
    const placed =
        top.length === TOP_PLACES ? [top[1], top[0], top[2]] : top

    return (
        <Card className="overflow-hidden">
            {placed.length > 0 && (
                <View className="flex-row items-end justify-center gap-3 px-5 pb-5 pt-6">
                    {placed.map((m) => (
                        <TopPlace
                            key={m.userID}
                            entry={m}
                            rank={rankOf(m)}
                            color={colorOf(m)}
                            isMe={m.userID === meID}
                        />
                    ))}
                </View>
            )}
            {rest.map((m, i) => {
                const isMe = m.userID === meID
                return (
                    <MemberRow
                        key={m.userID}
                        rank={rankOf(m)}
                        color={colorOf(m)}
                        username={m.username}
                        isMe={isMe}
                        // The first row is ruled off from the top three above it.
                        divided={i > 0 || placed.length > 0}
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
                            color={colorOf(m)}
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
