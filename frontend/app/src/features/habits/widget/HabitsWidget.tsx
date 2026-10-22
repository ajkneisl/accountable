// iOS home screen widget: a heatmap of every habit, fed by `syncHabitsWidget`.
//
// The component body is serialized into the widget extension and run in an
// isolated runtime, so it can't touch anything outside its own body: no imports
// beyond @expo/ui, no module-level constants or helpers, no hooks. Everything it
// needs (including precomputed levels) arrives through props.

import {
    HStack,
    RoundedRectangle,
    Spacer,
    Text,
    VStack
} from "@expo/ui/swift-ui"
import {
    containerBackground,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    padding,
    widgetURL
} from "@expo/ui/swift-ui/modifiers"
import { createWidget, type WidgetEnvironment } from "expo-widgets"

export interface HabitsWidgetRow {
    name: string
    /** Accent hex for this habit's strip. */
    color: string
    streak: number
    /** Last 14 days, oldest first: 1 done, 0 not. */
    recent: number[]
}

export interface HabitsWidgetProps {
    /**
     * Week columns, oldest first, each Mon→Sun. 0–4 is the share of habits done
     * that day (0 none, 4 all); -1 is a day after today.
     */
    weeks: number[][]
    doneToday: number
    habitCount: number
    rows: HabitsWidgetRow[]
    signedOut: boolean
}

const HabitsWidget = (props: HabitsWidgetProps, env: WidgetEnvironment) => {
    "widget"

    const dark = env.colorScheme === "dark"
    const bg = dark ? "#16100c" : "#f8f5ef"
    const ink = dark ? "#f8f5ef" : "#16100c"
    const ink3 = "#7b736c"
    const empty = dark ? "#2b2520" : "#e9e4de"
    const levels = [empty, "#d5f9b2", "#bdf27e", "#a2eb3c", "#6fae1a"]

    const family = env.widgetFamily
    const cols = family === "systemSmall" ? 8 : 20
    const cell = 11
    const gap = 3

    const root = [
        containerBackground(bg, "widget"),
        widgetURL("accountable://habits")
    ]

    if (props.signedOut || props.habitCount === 0) {
        return (
            <VStack alignment="leading" spacing={4} modifiers={root}>
                <Text
                    modifiers={[
                        font({ size: 15, weight: "bold" }),
                        foregroundStyle(ink)
                    ]}
                >
                    Habits
                </Text>
                <Text modifiers={[font({ size: 12 }), foregroundStyle(ink3)]}>
                    {props.signedOut
                        ? "Sign in to Accountable to see your habits."
                        : "Add a habit in Accountable to start your heatmap."}
                </Text>
                <Spacer />
            </VStack>
        )
    }

    const header = (
        <HStack spacing={6}>
            <Text
                modifiers={[
                    font({ size: 13, weight: "bold" }),
                    foregroundStyle(ink)
                ]}
            >
                Habits
            </Text>
            <Spacer />
            <Text
                modifiers={[
                    font({ size: 12, weight: "medium", design: "monospaced" }),
                    foregroundStyle(ink3)
                ]}
            >
                {family === "systemSmall"
                    ? `${props.doneToday}/${props.habitCount}`
                    : `${props.doneToday}/${props.habitCount} today`}
            </Text>
        </HStack>
    )

    const heatmap = (
        <HStack spacing={gap}>
            {props.weeks.slice(-cols).map((week, c) => (
                <VStack key={c} spacing={gap}>
                    {week.map((level, r) => (
                        <RoundedRectangle
                            key={r}
                            cornerRadius={2.5}
                            modifiers={[
                                frame({ width: cell, height: cell }),
                                foregroundStyle(level < 0 ? bg : levels[level])
                            ]}
                        />
                    ))}
                </VStack>
            ))}
        </HStack>
    )

    if (family !== "systemLarge") {
        return (
            <VStack alignment="leading" spacing={8} modifiers={root}>
                {header}
                {heatmap}
            </VStack>
        )
    }

    return (
        <VStack alignment="leading" spacing={10} modifiers={root}>
            {header}
            {heatmap}
            <VStack
                alignment="leading"
                spacing={8}
                modifiers={[padding({ top: 4 })]}
            >
                {props.rows.slice(0, 5).map((row, i) => (
                    <HStack key={i} spacing={8}>
                        <Text
                            modifiers={[
                                font({ size: 12, weight: "medium" }),
                                foregroundStyle(ink),
                                lineLimit(1),
                                frame({ width: 72, alignment: "leading" })
                            ]}
                        >
                            {row.name}
                        </Text>
                        <HStack spacing={gap}>
                            {row.recent.map((d, j) => (
                                <RoundedRectangle
                                    key={j}
                                    cornerRadius={2.5}
                                    modifiers={[
                                        frame({ width: cell, height: cell }),
                                        foregroundStyle(d ? row.color : empty)
                                    ]}
                                />
                            ))}
                        </HStack>
                        <Spacer />
                        <Text
                            modifiers={[
                                font({ size: 11, design: "monospaced" }),
                                foregroundStyle(ink3)
                            ]}
                        >
                            {`${row.streak}d`}
                        </Text>
                    </HStack>
                ))}
            </VStack>
            <Spacer />
        </VStack>
    )
}

export default createWidget<HabitsWidgetProps>("HabitsHeatmap", HabitsWidget)
