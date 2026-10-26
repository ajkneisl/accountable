// Competitions tab — every competition the user belongs to, plus create/join.
// Merges the web's sidebar competition list with its AllCompetitions page.

import { useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import { useAtomValue } from "jotai"
import type { CompetitionSummary } from "@shared/index"
import { userAtom } from "../../../auth"
import { EmptyState } from "../../../ui/EmptyState"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import {
    AddCard,
    Button,
    Card,
    Chip,
    Display,
    Mono
} from "../../../ui/primitives"
import { useAppData } from "../../../features/common/AppData"
import { CompetitionSheet } from "../../../features/competition/components/CompetitionSheet"

type Filter = "all" | "owned" | "joined"

const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "owned", label: "Created" },
    { value: "joined", label: "Joined" }
]

export default function Competitions() {
    const { data, loading, reload } = useAppData()
    const user = useAtomValue(userAtom)
    const [sheetOpen, setSheetOpen] = useState(false)
    const [filter, setFilter] = useState<Filter>("all")

    const competitions = data.competitions
    const meID = user?.userID

    // In the server's order: most recently joined first.
    const visible = useMemo(
        () =>
            competitions.filter((c) => {
                if (filter === "owned") return c.ownerID === meID
                if (filter === "joined") return c.ownerID !== meID
                return true
            }),
        [competitions, filter, meID]
    )

    const narrowed = filter !== "all"

    return (
        <Screen
            refreshing={loading}
            onRefresh={reload}
            topRight={<SettingsButton />}
        >
            <View className="gap-2 pr-12">
                <Display size={32}>Competitions</Display>
            </View>

            {competitions.length > 0 && (
                <View className="flex-row">
                    <Segmented
                        options={FILTERS}
                        value={filter}
                        onChange={setFilter}
                    />
                </View>
            )}

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
            ) : visible.length === 0 ? (
                <Card className="gap-3 p-5">
                    <Text className="text-[13px] text-ink-3">
                        No competitions match this filter.
                    </Text>
                    <Button
                        label="Clear filter"
                        variant="line"
                        size="sm"
                        onPress={() => setFilter("all")}
                    />
                </Card>
            ) : (
                <View className="gap-3">
                    {narrowed && (
                        <Mono className="text-xs uppercase text-ink-3">
                            Showing {visible.length} of {competitions.length}
                        </Mono>
                    )}
                    {visible.map((c) => (
                        <CompetitionRow
                            key={c.id}
                            competition={c}
                            owned={c.ownerID === meID}
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
                    onClose={() => setSheetOpen(false)}
                    onDone={(id) => {
                        setSheetOpen(false)
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
    owned
}: {
    competition: CompetitionSummary
    owned: boolean
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
                <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-ink">
                    <Mono className="text-[15px] font-bold text-bg">
                        {(c.name[0] ?? "?").toUpperCase()}
                    </Mono>
                </View>
                <View className="flex-1 flex-row items-center gap-2">
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
                <Text className="text-base text-ink-3">›</Text>
            </Card>
        </Pressable>
    )
}

/** Compact pill toggle for the filter row. */
function Segmented<T extends string>({
    options,
    value,
    onChange
}: {
    options: { value: T; label: string }[]
    value: T
    onChange: (v: T) => void
}) {
    return (
        <View className="flex-row rounded-full bg-bg-sunken p-0.5">
            {options.map((o) => {
                const selected = o.value === value
                return (
                    <Pressable
                        key={o.value}
                        onPress={() => onChange(o.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className={`rounded-full px-3 py-1.5 ${
                            selected ? "bg-bg-card" : ""
                        }`}
                    >
                        <Text
                            className={`text-[12px] font-semibold ${
                                selected ? "text-ink" : "text-ink-3"
                            }`}
                        >
                            {o.label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}
