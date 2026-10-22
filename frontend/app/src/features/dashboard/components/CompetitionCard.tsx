// Dashboard summary of competitions — the top competition's members ranked by
// streak, with the user highlighted. Only shown when the user is in at least
// one competition. Tapping it opens that competition.

import { Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import type { CompetitionDetail } from "@shared/index"
import { Card, Chip, Dot, Eyebrow, Mono } from "../../../ui/primitives"
import { buildColorMap } from "../../competition/colors"

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
    const colorMap = buildColorMap(competition.members.map((m) => m.userID))
    const ranked = [...competition.members].sort((a, b) => b.streak - a.streak)
    const shown = ranked.slice(0, MAX_ROWS)
    const hidden = ranked.length - shown.length
    const myRank = ranked.findIndex((m) => m.userID === meID)

    const subtitle =
        competition.members.length === 1
            ? `Just you so far · share #${competition.joinCode}`
            : `${competition.members.length} members · ${competition.goals.length} goals`

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
                <View className="mb-3.5 flex-row items-center justify-between">
                    <Eyebrow>Competition</Eyebrow>
                    {myRank >= 0 && competition.members.length > 1 && (
                        <Chip>
                            <Mono className="text-[11px] font-semibold text-ink-2">
                                #{myRank + 1} of {ranked.length}
                            </Mono>
                        </Chip>
                    )}
                </View>

                <Text
                    numberOfLines={1}
                    className="text-[18px] font-semibold tracking-tight text-ink"
                >
                    {competition.name}
                </Text>
                <Text className="mb-3.5 mt-0.5 text-[13px] text-ink-3">
                    {subtitle}
                </Text>

                <View className="gap-2 border-t border-line-2 pt-3.5">
                    {shown.map((m, i) => {
                        const me = m.userID === meID
                        return (
                            <View
                                key={m.userID}
                                className="flex-row items-center gap-2.5"
                            >
                                <Mono className="w-5 text-xs text-ink-3">
                                    {i + 1}
                                </Mono>
                                <Dot color={colorMap[m.userID]} />
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
