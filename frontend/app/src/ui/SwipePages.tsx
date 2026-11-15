// Side-by-side pages under their own floating tab bar, for a pushed screen that
// has more than one view. Swiping moves between pages with the bar's pill
// following the finger, and tapping a tab scrolls to its page.
//
// Unlike the main tabs these pages aren't routes — they're one screen — so the
// selection is just the pager's scroll position.

import { type ReactNode, useEffect, useRef, useState } from "react"
import { ScrollView, useWindowDimensions, View } from "react-native"
import Animated, {
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useSharedValue
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { scheduleOnRN } from "react-native-worklets"
import { TAB_BAR_HEIGHT, TabBar, type TabBarItem, tabBarBottom } from "./TabBar"

export type SwipePage = TabBarItem & {
    /** The page's content; it scrolls on its own, spaced like a screen's cards. */
    content: ReactNode
}

export function SwipePages({
    pages,
    onPageChange
}: {
    pages: SwipePage[]
    /** Called with the page a swipe is nearest, for chrome that depends on it. */
    onPageChange?: (page: number) => void
}) {
    const { width } = useWindowDimensions()
    const insets = useSafeAreaInsets()
    const pager = useRef<Animated.ScrollView>(null)
    const position = useSharedValue(0)
    const last = pages.length - 1

    const onScroll = useAnimatedScrollHandler(
        {
            onScroll: (e) => {
                position.set(e.contentOffset.x / width)
            }
        },
        [width]
    )

    // The page a swipe is nearest: it changes past halfway, not every frame.
    const [active, setActive] = useState(0)
    useAnimatedReaction(
        () => Math.round(Math.min(last, Math.max(0, position.get()))),
        (now, previous) => {
            if (now !== previous) scheduleOnRN(setActive, now)
        },
        [last]
    )
    const report = useRef(onPageChange)
    report.current = onPageChange
    useEffect(() => {
        report.current?.(active)
    }, [active])

    // Pages pad their content past the bar, so the last card can scroll clear.
    const barBottom = tabBarBottom(insets.bottom)
    const barTop = barBottom + TAB_BAR_HEIGHT

    return (
        <View className="flex-1">
            <Animated.ScrollView
                ref={pager}
                horizontal
                pagingEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
                scrollEventThrottle={16}
                onScroll={onScroll}
            >
                {pages.map((page) => (
                    <ScrollView
                        key={page.label}
                        style={{ width }}
                        contentContainerClassName="gap-4 px-5 pt-4"
                        contentContainerStyle={{ paddingBottom: barTop + 40 }}
                    >
                        {page.content}
                    </ScrollView>
                ))}
            </Animated.ScrollView>

            <View
                pointerEvents="box-none"
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: barBottom
                }}
            >
                <TabBar
                    tabs={pages}
                    initial={0}
                    position={position}
                    onSelect={(page) =>
                        pager.current?.scrollTo({
                            x: page * width,
                            animated: true
                        })
                    }
                />
            </View>
        </View>
    )
}
