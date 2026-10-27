// Dashboard summary of competitions — the top competition's members ranked by
// streak, with the user highlighted. Only shown when the user is in at least
// one competition. Tapping it opens that competition.

import { Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import type { CompetitionDetail } from "@shared/index"
import { Card, Eyebrow, Mono } from "../../../ui/primitives"
import { useScheme } from "../../../theme"
import { buildColorMap, onMemberFill } from "../../competition/colors"
import { CardFigure } from "./CardFigure"

/** Members shown before collapsing the rest into "+N more". */
const MAX_ROWS = 4

export function CompetitionCard({
    competition,
    total,
    meID
}: {
    competition: CompetitionDetail
    /** How many competitions the user is in, including [competition]. */
    total: number
    meID: string | undefined
}) {
    const scheme = useScheme()
    const colorMap = buildColorMap(competition.members, scheme)
    const ranked = [...competition.members].sort((a, b) => b.streak - a.streak)
    const shown = ranked.slice(0, MAX_ROWS)
    const hidden = ranked.length - shown.length
    const myRank = ranked.findIndex((m) => m.userID === meID)

    const members = competition.members.length

    return (
        <Pressable
            accessibilityRole="button"
            onPress={() =>
                router.push({
                    pathname: "/competition/[id]",
                    params: { id: competition.id }
                })
            }
        >
            <Card className="p-5">
                {/* Laid out like the Habits card: the figure sits beside the
                    eyebrow and name rather than heightening a header. */}
                <View className="mb-3.5 flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                        <Eyebrow className="mb-1.5">Competition</Eyebrow>
                        <Text
                            numberOfLines={1}
                            className="text-[18px] font-semibold tracking-tight text-ink"
                        >
                            {competition.name}
                        </Text>
                    </View>
                    {myRank >= 0 && members > 1 && (
                        <CardFigure
                            value={`#${myRank + 1}`}
                            caption={`of ${ranked.length}`}
                        />
                    )}
                </View>

                <View className="gap-2 border-t border-line-2 pt-3.5">
                    {shown.map((m, i) => {
                        const me = m.userID === meID
                        return (
                            <View
                                key={m.userID}
                                className="flex-row items-center gap-2.5"
                            >
                                {/* Rank, in the member's color */}
                                <View
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        backgroundColor: colorMap[m.userID]
                                    }}
                                    className="items-center justify-center"
                                >
                                    <Text
                                        style={{
                                            color: onMemberFill(
                                                colorMap[m.userID],
                                                scheme
                                            )
                                        }}
                                        className="text-[11px] font-bold"
                                    >
                                        {i + 1}
                                    </Text>
                                </View>
                                <Text
                                    numberOfLines={1}
                                    className={`flex-1 text-[14px] ${
                                        me
                                            ? "font-semibold text-ink"
                                            : "text-ink-2"
                                    }`}
                                >
                                    {me ? `${m.username} (you)` : m.username}
                                </Text>
                                <Mono className="text-[13px] font-semibold text-ink">
                                    {m.streak}d
                                </Mono>
                            </View>
                        )
                    })}
                    {hidden > 0 && (
                        <Text className="text-xs text-ink-3">
                            +{hidden} more
                        </Text>
                    )}
                </View>

                {total > 1 && (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push("/competitions")}
                        className="mt-3.5 border-t border-line-2 pt-3"
                    >
                        <Text className="text-[13px] font-semibold text-ink-2">
                            See all {total} competitions ›
                        </Text>
                    </Pressable>
                )}
            </Card>
        </Pressable>
    )
}
