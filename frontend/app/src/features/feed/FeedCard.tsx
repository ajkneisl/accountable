// One update in the feed: who, when, what they did, where it leaves their goals,
// and a heart. Cards say "Today" or a date rather than a time, since some sources
// only sync a few times a day.

import { Pressable, Text, View } from "react-native"
import { router } from "expo-router"
import type { FeedDetail, FeedGoalChip, FeedPost } from "@shared/index"
import { useColors, useScheme } from "../../theme"
import { ChevronIcon, HeartIcon } from "../../ui/icons"
import { Card, Chip, IntegrationIcon, Mono } from "../../ui/primitives"
import { memberFill, onMemberFill } from "../competition/colors"
import { formatAmount, isLimit, unitLabel } from "../dashboard/types"
import { WORKOUT_LABEL } from "../integration/components/WorkoutCard"

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
})

function localDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${date.getFullYear()}-${month}-${day}`
}

/** "Today", "Yesterday", or a short date, for a `YYYY-MM-DD` day. */
function dayLabel(day: string): string {
    const now = new Date()
    if (day === localDate(now)) return "Today"
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (day === localDate(yesterday)) return "Yesterday"
    const [y, m, d] = day.split("-").map(Number)
    return DATE_FMT.format(new Date(y, m - 1, d))
}

function plural(count: number, noun: string): string {
    return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`
}

function duration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

/** The card's headline and the lines under it. */
function describe(detail: FeedDetail): { title: string; lines: string[] } {
    switch (detail.type) {
        case "github": {
            const lines = detail.repos.map((r) => `${r.commits} in ${r.repo}`)
            // With nothing named, "and 5 more" would be saying nothing.
            if (detail.repos.length > 0 && detail.otherCommits > 0)
                lines.push(`and ${detail.otherCommits} more`)
            return { title: plural(detail.commits, "commit"), lines }
        }
        case "leetcode": {
            const lines = detail.solves.map(
                (s) => `${s.title} (${s.difficulty})`
            )
            if (detail.solves.length > 0 && detail.otherSolved > 0)
                lines.push(`and ${detail.otherSolved} more`)
            return {
                title: `${plural(detail.solved, "problem")} solved`,
                lines
            }
        }
        case "apple_fitness": {
            const stats = [
                detail.durationMin !== null && `${detail.durationMin} min`,
                // Calories are optional when logging by hand.
                detail.calories !== null &&
                    detail.calories > 0 &&
                    `${detail.calories.toLocaleString()} cal`
            ].filter((s): s is string => Boolean(s))
            return {
                title: detail.workoutType
                    ? WORKOUT_LABEL[detail.workoutType]
                    : "Worked out",
                lines: [
                    ...(stats.length > 0 ? [stats.join(", ")] : []),
                    ...(detail.manual ? ["Logged manually"] : [])
                ]
            }
        }
        case "apple_steps":
            return { title: plural(detail.steps, "step"), lines: [] }
        case "apple_sleep":
            return { title: `${duration(detail.minutes)} of sleep`, lines: [] }
        case "screen_time":
            return {
                title: `${duration(detail.minutes)} of screen time`,
                lines: []
            }
    }
}

/** "this week", "today" or "that day": the window a goal's progress covers. */
function windowLabel(post: FeedPost, chip: FeedGoalChip): string {
    if (chip.period === "WEEKLY") return "this week"
    return dayLabel(post.day) === "Today" ? "today" : "that day"
}

/** A limit that's still running has no result to show yet. */
function hasResult(post: FeedPost, chip: FeedGoalChip): boolean {
    return chip.met || !isLimit(post.integration, chip.metric)
}

/** Competition goals first, in an order that doesn't change between loads. */
function sortGoals(goals: FeedGoalChip[]): FeedGoalChip[] {
    const key = (g: FeedGoalChip) =>
        `${g.competitionName === null ? 1 : 0}:${g.competitionName}:${g.metric}:${g.period}`
    return [...goals].sort((a, b) => key(a).localeCompare(key(b)))
}

/** "2/5", shown in the card's corner. */
function fraction(post: FeedPost, chip: FeedGoalChip): string {
    const amount = (n: number) => formatAmount(post.integration, chip.metric, n)
    return `${amount(chip.value)}/${amount(chip.target)}`
}

/** "2 of 5 commits this week": the same progress, in words. */
function progressLabel(post: FeedPost, chip: FeedGoalChip): string {
    const amount = (n: number) => formatAmount(post.integration, chip.metric, n)
    const unit = unitLabel(post.integration, chip.metric)
    return `${amount(chip.value)} of ${amount(chip.target)} ${unit} ${windowLabel(post, chip)}`
}

/** What a chip says for a goal other than the one in the corner. */
function chipLabel(post: FeedPost, chip: FeedGoalChip): string {
    const outcome = chip.met
        ? isLimit(post.integration, chip.metric)
            ? "Under limit"
            : "Goal hit"
        : progressLabel(post, chip)
    return chip.competitionName
        ? `${outcome} in ${chip.competitionName}`
        : outcome
}

export function FeedCard({
    post,
    mine,
    onToggleLike
}: {
    post: FeedPost
    mine: boolean
    onToggleLike: () => void
}) {
    const colors = useColors()
    const scheme = useScheme()
    const fill = memberFill(post.actor.color, scheme)
    const { title, lines } = describe(post.detail)
    const goals = sortGoals(post.goals).filter((g) => hasResult(post, g))
    const headline = goals[0]
    // A personal and a competition goal can say the same thing as the corner.
    const chips = [
        ...new Set(
            goals
                .filter(
                    (g) =>
                        g.metric !== headline.metric ||
                        g.period !== headline.period ||
                        fraction(post, g) !== fraction(post, headline)
                )
                .map((g) => chipLabel(post, g))
        )
    ]
    const competitions = [
        ...new Map(
            post.goals.flatMap((g) =>
                g.competitionID && g.competitionName
                    ? [[g.competitionID, g.competitionName] as const]
                    : []
            )
        )
    ]

    return (
        <Card className="gap-3 p-4">
            <View className="flex-row items-center gap-3">
                <View
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: fill }}
                >
                    <Mono
                        className="text-[14px] font-bold"
                        style={{ color: onMemberFill(fill, scheme) }}
                    >
                        {(post.actor.username[0] ?? "?").toUpperCase()}
                    </Mono>
                </View>
                <View className="flex-1">
                    <Text
                        numberOfLines={1}
                        className="text-[15px] font-semibold text-ink"
                    >
                        {mine ? "You" : post.actor.username}
                    </Text>
                    <Text className="text-[12px] text-ink-3">
                        {dayLabel(post.day)}
                    </Text>
                </View>
                {headline && (
                    <View
                        accessible
                        accessibilityLabel={progressLabel(post, headline)}
                    >
                        <Mono
                            className="text-[15px] font-bold"
                            style={{
                                color: headline.met
                                    ? colors.limeInk
                                    : colors.ink2
                            }}
                        >
                            {fraction(post, headline)}
                        </Mono>
                    </View>
                )}
                <IntegrationIcon name={post.integration} size={20} />
            </View>

            <View className="gap-1">
                <Text className="text-[20px] font-semibold tracking-tight text-ink">
                    {title}
                </Text>
                {lines.map((line) => (
                    <Text
                        key={line}
                        numberOfLines={1}
                        className="text-[13px] text-ink-2"
                    >
                        {line}
                    </Text>
                ))}
            </View>

            {competitions.length + chips.length > 0 && (
                <View className="flex-row flex-wrap gap-1.5">
                    {competitions.map(([id, name]) => (
                        <Pressable
                            key={id}
                            accessibilityRole="link"
                            accessibilityLabel={`Open ${name}`}
                            hitSlop={6}
                            onPress={() =>
                                router.push({
                                    pathname: "/competition/[id]",
                                    params: { id }
                                })
                            }
                        >
                            <Chip>
                                <Text className="text-[11px] font-semibold text-ink">
                                    {name}
                                </Text>
                                <ChevronIcon color={colors.ink3} size={11} />
                            </Chip>
                        </Pressable>
                    ))}
                    {chips.map((chip) => (
                        <Chip key={chip}>
                            <Text className="text-[11px] font-semibold text-ink-2">
                                {chip}
                            </Text>
                        </Chip>
                    ))}
                </View>
            )}

            <Likes
                count={post.likeCount}
                liked={post.likedByMe}
                // Your own card shows its hearts, but they're not yours to give.
                onPress={mine ? undefined : onToggleLike}
                color={post.likedByMe ? colors.coral : colors.ink3}
            />
        </Card>
    )
}

function Likes({
    count,
    liked,
    onPress,
    color
}: {
    count: number
    liked: boolean
    onPress?: () => void
    color: string
}) {
    if (!onPress && count === 0) return null
    const content = (
        <>
            <HeartIcon color={color} size={20} filled={liked} />
            {count > 0 && (
                <Text className="text-[13px] font-semibold text-ink-2">
                    {count}
                </Text>
            )}
        </>
    )
    if (!onPress) {
        return (
            <View
                accessibilityLabel={plural(count, "like")}
                className="flex-row items-center gap-1.5 self-start"
            >
                {content}
            </View>
        )
    }
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${liked ? "Unlike" : "Like"}, ${plural(count, "like")}`}
            accessibilityState={{ selected: liked }}
            hitSlop={10}
            onPress={onPress}
            className="flex-row items-center gap-1.5 self-start"
        >
            {content}
        </Pressable>
    )
}
