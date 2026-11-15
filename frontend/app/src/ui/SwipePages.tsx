// Side-by-side pages under a strip of text tabs, for a pushed screen that has
// more than one view. Swiping moves between pages with the strip's underline
// following the finger, and tapping a tab scrolls to its page.
//
// The strip closes the screen's own header: plain labels over a hairline, not
// another box, so everything boxed below it is the page's content. It's at the
// top so the bottom of the screen stays the app's — a second bar down there
// would read as the main tabs. Unlike those, these pages aren't routes —
// they're one screen — so the selection is just the pager's scroll position.

import { type ReactNode, useEffect, useRef, useState } from "react"
import { ScrollView, useWindowDimensions, View } from "react-native"
import Animated, {
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useSharedValue
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { scheduleOnRN } from "react-native-worklets"
import { TabStrip } from "./TabStrip"

export type SwipePage = {
    label: string
    /** The page's content; it scrolls on its own, spaced like a screen's cards. */
    content: ReactNode
}

export function SwipePages({
    pages,
    initialPage = 0,
    onPageChange
}: {
    pages: SwipePage[]
    /** The page shown on mount. */
    initialPage?: number
    /** Called with the page a swipe is nearest, for chrome that depends on it. */
    onPageChange?: (page: number) => void
}) {
    const { width } = useWindowDimensions()
    const insets = useSafeAreaInsets()
    const pager = useRef<Animated.ScrollView>(null)
    const position = useSharedValue(initialPage)
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
    const [active, setActive] = useState(initialPage)
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

    return (
        <View className="flex-1">
            <TabStrip
                labels={pages.map((p) => p.label)}
                active={active}
                position={position}
                onSelect={(page) =>
                    pager.current?.scrollTo({
                        x: page * width,
                        animated: true
                    })
                }
            />

            <Animated.ScrollView
                ref={pager}
                horizontal
                pagingEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
                contentOffset={{ x: initialPage * width, y: 0 }}
                scrollEventThrottle={16}
                onScroll={onScroll}
            >
                {pages.map((page) => (
                    <ScrollView
                        key={page.label}
                        style={{ width }}
                        contentContainerClassName="gap-4 px-5 pt-5"
                        contentContainerStyle={{
                            paddingBottom: insets.bottom + 40
                        }}
                    >
                        {page.content}
                    </ScrollView>
                ))}
            </Animated.ScrollView>
        </View>
    )
}
