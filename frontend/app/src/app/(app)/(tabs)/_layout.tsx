// Bottom tabs — what the web's left sidebar becomes on a phone. The sidebar's
// goal and competition lists get their own Goals and Competitions tabs; its
// account menu and integrations sit behind the gear in each tab's top-right
// corner.
//
// Native tabs render the platform's own tab bar, so on iOS 26+ it's the Liquid
// Glass bar (and it floats over content that scrolls beneath it).

import { NativeTabs } from "expo-router/unstable-native-tabs"
import { useColors } from "../../../theme"

export default function TabsLayout() {
    const colors = useColors()
    return (
        <NativeTabs tintColor={colors.ink} minimizeBehavior="onScrollDown">
            <NativeTabs.Trigger name="dashboard">
                <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
                <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="goals">
                <NativeTabs.Trigger.Icon sf="target" md="track_changes" />
                <NativeTabs.Trigger.Label>Goals</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="habits">
                <NativeTabs.Trigger.Icon
                    sf="square.grid.2x2.fill"
                    md="grid_view"
                />
                <NativeTabs.Trigger.Label>Habits</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="competitions">
                <NativeTabs.Trigger.Icon sf="trophy.fill" md="trophy" />
                <NativeTabs.Trigger.Label>
                    Competitions
                </NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    )
}
