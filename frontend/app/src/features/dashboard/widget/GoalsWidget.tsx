// iOS home screen widget: one card per goal (this week's total against the
// weekly target, or today's value against a daily goal's target, on-pace
// status, and a Mon–Sun bar strip), fed by
// `syncGoalsWidget`. Small shows one goal, medium two side by side, large a 2×2
// grid under an on-pace summary. Which goals is picked per widget in Edit Widget
// (see plugins/withGoalsWidgetPicker.js); unpicked widgets show the first ones.
//
// The component body is serialized into the widget extension and run in an
// isolated runtime, so it can't touch anything outside its own body: no imports
// beyond @expo/ui, no module-level constants or helpers, no hooks. Everything it
// needs (including on-pace status) arrives through props.

import {
    HStack,
    RoundedRectangle,
    Spacer,
    Text,
    VStack
} from "@expo/ui/swift-ui"
import {
    background,
    containerBackground,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    minimumScaleFactor,
    multilineTextAlignment,
    padding,
    shapes,
    widgetURL
} from "@expo/ui/swift-ui/modifiers"
import { createWidget, type WidgetEnvironment } from "expo-widgets"

export interface GoalsWidgetGoal {
    /** `integration:metric:period`, as in `goalKey`. */
    id: string
    /** "5 commits / week" style label; also the option shown in Edit Widget. */
    name: string
    /** Integration name, e.g. "GitHub". */
    source: string
    /** Accent hex while on pace; the card turns coral when behind. */
    color: string
    /** This week's total so far; today's value for a daily goal. */
    total: number
    /** The goal's own target: per week, or per day for a daily goal. */
    target: number
    unit: string
    status: "onTrack" | "atRisk" | "behind"
    /** Per-day values, Monday first; -1 for a day after today. */
    days: number[]
    /** Per-day target the bars are measured against. */
    dayTarget: number
}

export interface GoalsWidgetProps {
    /** Every goal, in app order; also the options offered in Edit Widget. */
    goals: GoalsWidgetGoal[]
    onPace: number
    signedOut: boolean
}

export interface GoalsWidgetConfiguration {
    /** IDs of the goals picked in Edit Widget; empty until someone picks. */
    goals?: string[]
}

const GoalsWidget = (
    props: GoalsWidgetProps,
    env: WidgetEnvironment<GoalsWidgetConfiguration>
) => {
    "widget"

    const dark = env.colorScheme === "dark"
    const bg = dark ? "#16100c" : "#f8f5ef"
    const ink = dark ? "#f8f5ef" : "#16100c"
    // Lifted on dark so secondary text keeps its contrast.
    const ink3 = dark ? "#958c84" : "#7b736c"
    const empty = dark ? "#2b2520" : "#e9e4de"
    const coral = "#fd6a3a"
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
    const barHeight = family === "systemLarge" ? 40 : 28

    // Fill the whole widget; without a frame the stack hugs its content and
    // floats in the middle.
    const root = [
        frame({ maxWidth: 1000, maxHeight: 1000, alignment: "topLeading" }),
        containerBackground(bg, "widget"),
        widgetURL("accountable://goals")
    ]

    if (props.signedOut || props.goals.length === 0) {
        return (
            <VStack alignment="leading" spacing={4} modifiers={root}>
                <Text
                    modifiers={[
                        font({ size: 15, weight: "bold" }),
                        foregroundStyle(ink)
                    ]}
                >
                    Goals
                </Text>
                <Text modifiers={[font({ size: 12 }), foregroundStyle(ink3)]}>
                    {props.signedOut
                        ? "Sign in to Beacc to see your goals."
                        : "Add a goal in Beacc to track it here."}
                </Text>
                <Spacer />
            </VStack>
        )
    }

    const mono = (size: number, weight: "medium" | "bold" = "medium") =>
        font({ size, weight, design: "monospaced" })

    const card = (goal: GoalsWidgetGoal, key: number) => {
        const accent = fillFor(goal.color)
        const tone = textFor(goal.status === "behind" ? coral : goal.color)
        // Headroom above the tallest bar, as on the in-app week chart.
        const max = Math.max(goal.dayTarget, ...goal.days, 1) * 1.2
        return (
            <VStack
                key={key}
                alignment="leading"
                spacing={4}
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
                        {goal.name}
                    </Text>
                    <Spacer />
                </HStack>
                <HStack alignment="lastTextBaseline" spacing={4}>
                    <Text
                        modifiers={[
                            mono(24, "bold"),
                            foregroundStyle(ink),
                            lineLimit(1),
                            minimumScaleFactor(0.6)
                        ]}
                    >
                        {`${goal.total}`}
                    </Text>
                    <Text
                        modifiers={[
                            font({ size: 11 }),
                            foregroundStyle(ink3),
                            lineLimit(1),
                            minimumScaleFactor(0.8)
                        ]}
                    >
                        {`/ ${goal.target} ${goal.unit}`}
                    </Text>
                    <Spacer />
                </HStack>
                <Spacer minLength={0} />
                <HStack alignment="bottom" spacing={3}>
                    {goal.days.map((v, i) => (
                        <RoundedRectangle
                            key={i}
                            cornerRadius={2.5}
                            modifiers={[
                                frame({
                                    maxWidth: 1000,
                                    height:
                                        v <= 0
                                            ? 3
                                            : Math.max(
                                                  (v / max) * barHeight,
                                                  4
                                              )
                                }),
                                foregroundStyle(
                                    v < 0
                                        ? "clear"
                                        : v > 0 && v >= goal.dayTarget
                                          ? accent
                                          : empty
                                )
                            ]}
                        />
                    ))}
                </HStack>
                <Text modifiers={[mono(11), foregroundStyle(tone)]}>
                    {goal.status === "onTrack"
                        ? "on pace"
                        : goal.status === "atRisk"
                          ? "at risk"
                          : "behind"}
                </Text>
            </VStack>
        )
    }

    const slots =
        family === "systemSmall" ? 1 : family === "systemLarge" ? 4 : 2
    // Goals picked in Edit Widget, in picked order; app order until then.
    const picked = (env.configuration?.goals ?? []).flatMap((id) =>
        props.goals.filter((g) => g.id === id)
    )
    const shown = (picked.length > 0 ? picked : props.goals).slice(0, slots)
    const items = shown.map((goal, i) => card(goal, i))

    // A free slot invites filling it rather than leaving a hole in the layout.
    const more = props.goals.length > shown.length
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
                    {more ? "+ Show another goal" : "+ Add another goal"}
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
                    Goals
                </Text>
                <Spacer />
                <Text modifiers={[mono(12), foregroundStyle(ink3)]}>
                    {`${props.onPace}/${props.goals.length} on pace`}
                </Text>
            </HStack>
            {rows}
        </VStack>
    )
}

export default createWidget<GoalsWidgetProps, GoalsWidgetConfiguration>(
    "GoalsProgress",
    GoalsWidget
)
