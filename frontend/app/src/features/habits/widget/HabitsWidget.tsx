// iOS home screen widget: one card per habit (name, streak, heatmap), fed by
// `syncHabitsWidget`. Small shows one habit, medium two side by side, large a
// 2×2 grid under a day summary. Which habits is picked per widget in Edit Widget
// (see plugins/withHabitsWidgetPicker.js); unpicked widgets show the first ones.
//
// The component body is serialized into the widget extension and run in an
// isolated runtime, so it can't touch anything outside its own body: no imports
// beyond @expo/ui, no module-level constants or helpers, no hooks. Everything it
// needs (including precomputed cells) arrives through props.

import {
    HStack,
    RoundedRectangle,
    Spacer,
    Text,
    VStack
} from "@expo/ui/swift-ui"
import {
    aspectRatio,
    background,
    containerBackground,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    multilineTextAlignment,
    padding,
    shapes,
    widgetURL
} from "@expo/ui/swift-ui/modifiers"
import { createWidget, type WidgetEnvironment } from "expo-widgets"

export interface HabitsWidgetHabit {
    id: string
    name: string
    /** Accent hex for this habit's cells. */
    color: string
    streak: number
    doneToday: boolean
    /**
     * Week columns, oldest first, each Mon→Sun: 1 done, 0 not, -1 a day after
     * today.
     */
    weeks: number[][]
}

export interface HabitsWidgetProps {
    /** Every habit, in app order; also the options offered in Edit Widget. */
    habits: HabitsWidgetHabit[]
    doneToday: number
    habitCount: number
    signedOut: boolean
}

export interface HabitsWidgetConfiguration {
    /** IDs of the habits picked in Edit Widget; empty until someone picks. */
    habits?: string[]
}

const HabitsWidget = (
    props: HabitsWidgetProps,
    env: WidgetEnvironment<HabitsWidgetConfiguration>
) => {
    "widget"

    const dark = env.colorScheme === "dark"
    const bg = dark ? "#16100c" : "#f8f5ef"
    const ink = dark ? "#f8f5ef" : "#16100c"
    // Lifted on dark so secondary text keeps its contrast.
    const ink3 = dark ? "#958c84" : "#7b736c"
    const empty = dark ? "#2b2520" : "#e9e4de"
    // The palette is tuned for the light paper: on dark, the Ink accent is the
    // background itself and Indigo nearly so, so lift both.
    const fillFor = (hex: string) =>
        !dark
            ? hex
            : hex === "#16100c"
              ? ink
              : hex === "#2e40a3"
                ? "#8e9cf0"
                : hex
    // An accent used as text: Lime and Coral are too pale to read on the paper.
    const textFor = (hex: string) =>
        dark
            ? fillFor(hex)
            : hex === "#a2eb3c"
              ? "#4c7a0c"
              : hex === "#fd6a3a"
                ? "#d9531e"
                : hex

    const family = env.widgetFamily
    const cols = family === "systemSmall" ? 8 : 9
    const gap = 3

    // Fill the whole widget; without a frame the stack hugs its content and
    // floats in the middle.
    const root = [
        frame({ maxWidth: 1000, maxHeight: 1000, alignment: "topLeading" }),
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
                        ? "Sign in to Beacc to see your habits."
                        : "Add a habit in Beacc to start your heatmap."}
                </Text>
                <Spacer />
            </VStack>
        )
    }

    const card = (habit: HabitsWidgetHabit, key: number) => {
        const fill = fillFor(habit.color)
        return (
            <VStack
                key={key}
                alignment="leading"
                spacing={7}
                modifiers={[
                    // Cards share the row evenly and stretch to its height.
                    frame({
                        maxWidth: 1000,
                        maxHeight: 1000,
                        alignment: "topLeading"
                    })
                ]}
            >
                <HStack spacing={4}>
                    <Text
                        modifiers={[
                            font({ size: 13, weight: "bold" }),
                            foregroundStyle(ink),
                            lineLimit(1)
                        ]}
                    >
                        {habit.name}
                    </Text>
                    <Spacer />
                    <Text
                        modifiers={[
                            font({
                                size: 11,
                                weight: "medium",
                                design: "monospaced"
                            }),
                            foregroundStyle(
                                habit.doneToday ? textFor(habit.color) : ink3
                            )
                        ]}
                    >
                        {habit.doneToday
                            ? `✓ ${habit.streak}d`
                            : `${habit.streak}d`}
                    </Text>
                </HStack>
                {/* Cells are the largest squares the card has room for, so
                    the heatmap fills each widget size without clipping. */}
                <HStack
                    spacing={gap}
                    modifiers={[
                        frame({
                            maxWidth: 1000,
                            maxHeight: 1000,
                            alignment: "topLeading"
                        })
                    ]}
                >
                    {habit.weeks.slice(-cols).map((week, c) => (
                        <VStack key={c} spacing={gap}>
                            {week.map((d, r) => (
                                <RoundedRectangle
                                    key={r}
                                    cornerRadius={2.5}
                                    modifiers={[
                                        aspectRatio({
                                            ratio: 1,
                                            contentMode: "fit"
                                        }),
                                        foregroundStyle(
                                            d < 0 ? "clear" : d ? fill : empty
                                        )
                                    ]}
                                />
                            ))}
                        </VStack>
                    ))}
                </HStack>
            </VStack>
        )
    }

    const slots =
        family === "systemSmall" ? 1 : family === "systemLarge" ? 4 : 2
    // Habits picked in Edit Widget, in picked order; app order until then.
    const picked = (env.configuration?.habits ?? []).flatMap((id) =>
        props.habits.filter((h) => h.id === id)
    )
    const shown = (picked.length > 0 ? picked : props.habits).slice(0, slots)
    const items = shown.map((habit, i) => card(habit, i))

    // A free slot invites filling it rather than leaving a hole in the layout.
    const more = props.habitCount > shown.length
    const hasHint = items.length < slots
    if (hasHint) {
        items.push(
            <VStack
                key="hint"
                spacing={3}
                modifiers={[
                    padding({ all: 10 }),
                    frame({ maxWidth: 1000, maxHeight: 1000 }),
                    background(
                        empty,
                        shapes.roundedRectangle({ cornerRadius: 10 })
                    )
                ]}
            >
                <Text
                    modifiers={[
                        font({ size: 13, weight: "bold" }),
                        foregroundStyle(ink3)
                    ]}
                >
                    {more ? "+ Show another habit" : "+ Add another habit"}
                </Text>
                <Text
                    modifiers={[
                        font({ size: 11 }),
                        foregroundStyle(ink3),
                        multilineTextAlignment("center")
                    ]}
                >
                    {more
                        ? "Touch and hold, then Edit Widget."
                        : "Create one in Beacc to see it here."}
                </Text>
            </VStack>
        )
    }

    const rows = []
    for (let i = 0; i < items.length; i += 2) {
        rows.push(
            <HStack key={i} alignment="top" spacing={14}>
                {items[i]}
                {items[i + 1] ?? null}
            </HStack>
        )
    }

    if (family !== "systemLarge") {
        return (
            <VStack alignment="leading" modifiers={root}>
                {rows}
            </VStack>
        )
    }

    return (
        <VStack alignment="leading" spacing={14} modifiers={root}>
            <HStack spacing={6}>
                <Text
                    modifiers={[
                        font({ size: 15, weight: "bold" }),
                        foregroundStyle(ink)
                    ]}
                >
                    Habits
                </Text>
                <Spacer />
                <Text
                    modifiers={[
                        font({
                            size: 12,
                            weight: "medium",
                            design: "monospaced"
                        }),
                        foregroundStyle(ink3)
                    ]}
                >
                    {`${props.doneToday}/${props.habitCount} today`}
                </Text>
            </HStack>
            {rows}
        </VStack>
    )
}

export default createWidget<HabitsWidgetProps, HabitsWidgetConfiguration>(
    "HabitsHeatmap",
    HabitsWidget
)
