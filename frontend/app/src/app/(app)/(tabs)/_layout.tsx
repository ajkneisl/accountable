// Bottom tabs — what the web's left sidebar becomes on a phone. The sidebar's
// goal and competition lists get their own Goals and Competitions tabs; its
// account menu and integrations sit behind the gear in each tab's top-right
// corner.
//
// All four tabs sit side by side in a paging scroll view, so swiping shows the
// next one under the finger. The routes still drive it: a swipe that settles
// navigates to its tab, and navigating to a tab any other way (the bar, a link,
// a notification) jumps the pager there.

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useWindowDimensions, View } from "react-native"
import type { Href } from "expo-router"
import { useTabsWithTriggers } from "expo-router/ui"
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
    withSpring
} from "react-native-reanimated"
import {
    SafeAreaInsetsContext,
    useSafeAreaInsets
} from "react-native-safe-area-context"
import { scheduleOnRN } from "react-native-worklets"
import {
    TAB_BAR_HEIGHT,
    TabBar,
    type TabBarItem,
    tabBarBottom
} from "../../../ui/TabBar"

const TABS: (TabBarItem & { name: string; href: Href })[] = [
    { name: "home", href: "/home", label: "Home", sf: "house.fill" },
    { name: "goals", href: "/goals", label: "Goals", sf: "target" },
    {
        name: "habits",
        href: "/habits",
        label: "Habits",
        sf: "square.grid.2x2.fill"
    },
    {
        name: "competitions",
        href: "/competitions",
        label: "Competitions",
        sf: "trophy.fill"
    }
]

const TRIGGERS = TABS.map(({ name, href }) => ({
    type: "internal" as const,
    name,
    href
}))

export default function TabsLayout() {
    const { state, descriptors, navigation, NavigationContent } =
        useTabsWithTriggers({ triggers: TRIGGERS })
    const { width, height } = useWindowDimensions()
    const insets = useSafeAreaInsets()

    const routeName = state.routes[state.index].name
    const index = TABS.findIndex((t) => t.name === routeName)
    const indexRef = useRef(index)
    indexRef.current = index

    const pager = useRef<Animated.ScrollView>(null)
    const position = useSharedValue(index)
    const dragging = useSharedValue(false)
    // The tab a settled swipe just navigated to; the pager is already there.
    const swipedTo = useRef<number | null>(null)

    const settle = useCallback(
        (page: number) => {
            if (page === indexRef.current) return
            swipedTo.current = page
            navigation.navigate(TABS[page].name)
        },
        [navigation]
    )

    const select = useCallback(
        (page: number) => {
            if (page !== indexRef.current) navigation.navigate(TABS[page].name)
        },
        [navigation]
    )

    const onScroll = useAnimatedScrollHandler(
        {
            onBeginDrag: () => {
                dragging.set(true)
            },
            onScroll: (e) => {
                if (dragging.get()) position.set(e.contentOffset.x / width)
            },
            onMomentumEnd: (e) => {
                dragging.set(false)
                scheduleOnRN(settle, Math.round(e.contentOffset.x / width))
            }
        },
        [width, settle]
    )

    // Anything but a swipe switches pages instantly; only the bar's pill moves.
    useEffect(() => {
        if (swipedTo.current === index) {
            swipedTo.current = null
            return
        }
        dragging.set(false)
        position.set(withSpring(index, { duration: 300, dampingRatio: 1 }))
        pager.current?.scrollTo({ x: index * width, animated: false })
    }, [index, width, dragging, position])

    // Screens pad their scroll content by the bottom inset, so counting the bar
    // in it lets the last card scroll clear of the bar.
    const bottom = tabBarBottom(insets.bottom)
    const pageInsets = useMemo(
        () => ({ ...insets, bottom: bottom + TAB_BAR_HEIGHT }),
        [insets, bottom]
    )

    return (
        <NavigationContent>
            <View className="flex-1 bg-bg">
                <SafeAreaInsetsContext.Provider value={pageInsets}>
                    <Animated.ScrollView
                        ref={pager}
                        horizontal
                        pagingEnabled
                        directionalLockEnabled
                        showsHorizontalScrollIndicator={false}
                        contentInsetAdjustmentBehavior="never"
                        contentOffset={{ x: index * width, y: 0 }}
                        scrollEventThrottle={16}
                        onScroll={onScroll}
                    >
                        {TABS.map((tab) => {
                            const route = state.routes.find(
                                (r) => r.name === tab.name
                            )
                            return (
                                <View key={tab.name} style={{ width, height }}>
                                    {route && descriptors[route.key].render()}
                                </View>
                            )
                        })}
                    </Animated.ScrollView>
                </SafeAreaInsetsContext.Provider>
                <View
                    pointerEvents="box-none"
                    style={{ position: "absolute", left: 0, right: 0, bottom }}
                >
                    <TabBar
                        tabs={TABS}
                        initial={index}
                        position={position}
                        onSelect={select}
                    />
                </View>
            </View>
        </NavigationContent>
    )
}
