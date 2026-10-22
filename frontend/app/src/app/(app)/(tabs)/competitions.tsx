// Competitions tab — every competition the user belongs to, plus create/join.
// Merges the web's sidebar competition list with its AllCompetitions page.

import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import { Button, Card, Display, Mono } from "../../../ui/primitives"
import { useAppData } from "../../../features/common/AppData"
import { CompetitionSheet } from "../../../features/competition/components/CompetitionSheet"

export default function Competitions() {
    const { data, loading, reload } = useAppData()
    const [sheetMode, setSheetMode] = useState<"create" | "join" | null>(null)

    const competitions = data.competitions

    return (
        <Screen
            refreshing={loading}
            onRefresh={reload}
            topRight={<SettingsButton />}
        >
            <View className="gap-2">
                <Display size={32}>All competitions</Display>
                <Text className="text-[13px] text-ink-3">
                    {competitions.length} total
                </Text>
            </View>

            <View className="flex-row gap-2.5">
                <Button
                    label="+ New"
                    size="sm"
                    onPress={() => setSheetMode("create")}
                />
                <Button
                    label="Join with code"
                    variant="line"
                    size="sm"
                    onPress={() => setSheetMode("join")}
                />
            </View>

            {competitions.length === 0 ? (
                <Card className="p-5">
                    <Text className="text-[13px] text-ink-3">
                        {loading
                            ? "Loading…"
                            : "You're not in any competitions yet."}
                    </Text>
                </Card>
            ) : (
                <View className="gap-3">
                    {competitions.map((c) => (
                        <Pressable
                            key={c.id}
                            accessibilityRole="button"
                            onPress={() =>
                                router.push({
                                    pathname: "/competition/[id]",
                                    params: { id: c.id }
                                })
                            }
                        >
                            <Card className="flex-row items-center gap-3 p-4">
                                <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-ink">
                                    <Mono className="text-[15px] font-bold text-bg">
                                        {(c.name[0] ?? "?").toUpperCase()}
                                    </Mono>
                                </View>
                                <View className="flex-1">
                                    <Text
                                        numberOfLines={1}
                                        className="text-[16px] font-semibold tracking-tight text-ink"
                                    >
                                        {c.name}
                                    </Text>
                                    <Mono className="text-xs uppercase text-ink-3">
                                        #{c.joinCode}
                                    </Mono>
                                </View>
                                <Text className="text-base text-ink-3">›</Text>
                            </Card>
                        </Pressable>
                    ))}
                </View>
            )}

            {sheetMode && (
                <CompetitionSheet
                    initialMode={sheetMode}
                    onClose={() => setSheetMode(null)}
                    onDone={(id) => {
                        setSheetMode(null)
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
