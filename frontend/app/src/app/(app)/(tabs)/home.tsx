// Home — today's goals up top, then the feed: what you and the people in your
// competitions got done. Goal and competition data comes from the providers above
// the tabs; the feed loads its own, and follows them so a sync shows up here too.

import { useEffect, useRef } from "react"
import { Text, View } from "react-native"
import { router } from "expo-router"
import { useAtomValue } from "jotai"
import { userAtom } from "../../../auth"
import { useAppData } from "../../../features/common/AppData"
import { DashboardHeader } from "../../../features/dashboard/components/DashboardHeader"
import { OnboardingCard } from "../../../features/dashboard/components/OnboardingCard"
import { SyncAllButton } from "../../../features/dashboard/components/SyncAllButton"
import { TodayCard } from "../../../features/dashboard/components/TodayCard"
import { FeedCard } from "../../../features/feed/FeedCard"
import { FeedIntroCard } from "../../../features/feed/FeedIntroCard"
import { useFeed } from "../../../features/feed/useFeed"
import { useHabits } from "../../../features/habits/HabitsData"
import { EmptyState } from "../../../ui/EmptyState"
import { Screen } from "../../../ui/Screen"
import { SettingsButton } from "../../../ui/SettingsButton"
import { AddCard, Button, Card, Eyebrow } from "../../../ui/primitives"

/** Sync beside the gear, so every source can be pulled in from home. */
function HomeActions() {
    return (
        <View className="flex-row gap-2.5">
            <SyncAllButton />
            <SettingsButton />
        </View>
    )
}

/** For someone with goals but nobody to share them with yet. */
function InviteCard() {
    return (
        <Card className="gap-3 p-5">
            <Eyebrow>Better with friends</Eyebrow>
            <Text className="text-[15px] leading-[21px] text-ink">
                Your updates show up here. Start a competition and you'll see
                each other's, and be able to cheer them on.
            </Text>
            <Button
                label="Start a competition"
                size="sm"
                className="self-start"
                onPress={() => router.push("/competitions")}
            />
        </Card>
    )
}

export default function Home() {
    const user = useAtomValue(userAtom)
    const { data, loading, error, reload, openLogWorkout } = useAppData()
    const habits = useHabits()
    const feed = useFeed()

    // A sync publishes new cards, and it always ends by reloading the app data.
    const reloadFeed = feed.reload
    useEffect(() => {
        void reloadFeed()
    }, [data, reloadFeed])

    // The payload starts out empty, so only call it empty once it has loaded;
    // a later pull-to-refresh keeps what's already known.
    const loadedOnce = useRef(false)
    if (!loading) loadedOnce.current = true
    const allGoals = [...data.goals, ...data.competitionGoals]
    const fresh =
        loadedOnce.current &&
        allGoals.length === 0 &&
        habits.data !== null &&
        habits.data.habits.length === 0

    function refresh() {
        reload()
        habits.reload()
    }

    if (error) {
        return (
            <Screen
                refreshing={loading}
                onRefresh={refresh}
                topRight={<HomeActions />}
            >
                <Card className="bg-coral-soft p-4">
                    <Text className="text-[13px] text-coral-ink">{error}</Text>
                </Card>
            </Screen>
        )
    }

    const competing = data.competitions.length > 0
    const tracksWorkouts = allGoals.some(
        (g) => g.integration === "apple_fitness"
    )
    const posts = feed.posts ?? []

    return (
        <Screen
            refreshing={loading}
            onRefresh={refresh}
            topRight={<HomeActions />}
        >
            <DashboardHeader user={user} />

            {fresh ? (
                <OnboardingCard />
            ) : (
                // Competition goals count as your own, as on the Goals tab.
                <TodayCard goals={allGoals} streak={data.streak} />
            )}

            {tracksWorkouts && (
                <AddCard label="Log a workout" onPress={openLogWorkout} />
            )}

            {competing && <FeedIntroCard />}

            {loadedOnce.current && !fresh && !competing && <InviteCard />}

            {feed.error && posts.length === 0 && (
                <Card className="gap-3 p-5">
                    <Text className="text-[13px] text-ink-3">
                        Couldn't load your feed.
                    </Text>
                    <Button
                        label="Try again"
                        variant="line"
                        size="sm"
                        className="self-start"
                        onPress={() => void feed.reload()}
                    />
                </Card>
            )}

            {feed.posts !== null &&
                !feed.error &&
                posts.length === 0 &&
                competing && <EmptyState framed title="No updates yet" />}

            {posts.map((post) => (
                <FeedCard
                    key={post.id}
                    post={post}
                    mine={post.actor.userID === user?.userID}
                    onToggleLike={() => void feed.toggleLike(post)}
                />
            ))}

            {feed.hasMore && (
                <Button
                    label="Show more"
                    variant="line"
                    size="sm"
                    busy={feed.loadingMore}
                    className="self-center"
                    onPress={() => void feed.loadMore()}
                />
            )}
        </Screen>
    )
}
