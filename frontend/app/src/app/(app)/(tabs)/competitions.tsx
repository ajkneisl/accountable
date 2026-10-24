// Competitions tab — every competition the user belongs to, plus create/join.
// Merges the web's sidebar competition list with its AllCompetitions page.

import { useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import { useAtomValue } from "jotai"
import type { CompetitionSummary } from "@shared/index"
import { userAtom } from "../../../auth"
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
type Sort = "newest" | "oldest" | "name"

const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "owned", label: "Created" },
    { value: "joined", label: "Joined" }
]

const SORTS: { value: Sort; label: string }[] = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "name", label: "A–Z" }
]

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
})

const COMPARATORS: Record<
    Sort,
    (a: CompetitionSummary, b: CompetitionSummary) => number
> = {
    newest: (a, b) => b.createdAt - a.createdAt,
    oldest: (a, b) => a.createdAt - b.createdAt,
    name: (a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
}

export default function Competitions() {
    const { data, loading, reload } = useAppData()
    const user = useAtomValue(userAtom)
    const [sheetOpen, setSheetOpen] = useState(false)
    const [filter, setFilter] = useState<Filter>("all")
    const [sort, setSort] = useState<Sort>("newest")

    const competitions = data.competitions
    const meID = user?.userID
    const ownedCount = competitions.filter((c) => c.ownerID === meID).length

    const visible = useMemo(() => {
        return competitions
            .filter((c) => {
                if (filter === "owned") return c.ownerID === meID
                if (filter === "joined") return c.ownerID !== meID
                return true
            })
            .sort(COMPARATORS[sort])
    }, [competitions, filter, sort, meID])

    const narrowed = filter !== "all"

    return (
        <Screen
            refreshing={loading}
            onRefresh={reload}
            topRight={<SettingsButton />}
        >
            <View className="gap-2 pr-12">
                <Display size={32}>Competitions</Display>
                <Text className="text-[13px] text-ink-3">
                    {competitions.length} total · {ownedCount} created by you
                </Text>
            </View>

            {competitions.length > 0 && (
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                    <Segmented
                        options={FILTERS}
                        value={filter}
                        onChange={setFilter}
                    />
                    <Segmented
                        options={SORTS}
                        value={sort}
                        onChange={setSort}
                    />
                </View>
            )}

            {competitions.length === 0 ? (
                <Card className="p-5">
                    <Text className="text-[13px] text-ink-3">
                        {loading
                            ? "Loading…"
                            : "You're not in any competitions yet."}
                    </Text>
                </Card>
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

            {!(competitions.length === 0 && loading) && (
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
                <View className="flex-1 gap-0.5">
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
                    <Mono className="text-xs uppercase text-ink-3">
                        #{c.joinCode} · {DATE_FMT.format(new Date(c.createdAt))}
                    </Mono>
                </View>
                <Text className="text-base text-ink-3">›</Text>
            </Card>
        </Pressable>
    )
}

/** Compact pill toggle for the filter / sort rows. */
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
