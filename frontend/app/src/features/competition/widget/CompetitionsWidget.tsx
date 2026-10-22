// iOS home screen widget: the standings for one competition, fed by
// `syncCompetitionsWidget`. Small shows where you stand, medium the top three
// (with you swapped in if you're further down), large up to eight rows. Which
// competition is picked per widget in Edit Widget (see
// plugins/withCompetitionsWidgetPicker.js); unpicked widgets show the first one.
//
// The component body is serialized into the widget extension and run in an
// isolated runtime, so it can't touch anything outside its own body: no imports
// beyond @expo/ui, no module-level constants or helpers, no hooks. Everything it
// needs (including the ranking) arrives through props.

import { HStack, Spacer, Text, VStack } from "@expo/ui/swift-ui"
import {
    background,
    containerBackground,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    shapes,
    widgetURL
} from "@expo/ui/swift-ui/modifiers"
import { createWidget, type WidgetEnvironment } from "expo-widgets"

export interface CompetitionsWidgetMember {
    username: string
    /** This member's participant color, as on the competition board. */
    color: string
    goalsHit: number
    streak: number
    me: boolean
}

export interface CompetitionsWidgetCompetition {
    id: string
    name: string
    goalCount: number
    /** Ranked, leader first. */
    members: CompetitionsWidgetMember[]
}

export interface CompetitionsWidgetProps {
    /** Every competition, in app order; also the options offered in Edit Widget. */
    competitions: CompetitionsWidgetCompetition[]
    signedOut: boolean
}

export interface CompetitionsWidgetConfiguration {
    /** ID of the competition picked in Edit Widget; empty until someone picks. */
    competition?: string
}

const CompetitionsWidget = (
    props: CompetitionsWidgetProps,
    env: WidgetEnvironment<CompetitionsWidgetConfiguration>
) => {
    "widget"

    const dark = env.colorScheme === "dark"
    const bg = dark ? "#16100c" : "#f8f5ef"
    const ink = dark ? "#f8f5ef" : "#16100c"
    const ink3 = "#7b736c"
    const sunken = dark ? "#2b2520" : "#efeae2"
    // Podium tints for the top three, as on the competition board.
    const medal = ["#a2eb3c", "#cfb384", "#fd6a3a"]

    const family = env.widgetFamily

    // The competition picked in Edit Widget; the first one until then, or if
    // the picked one has since been left.
    const picked = props.competitions.filter(
        (c) => c.id === env.configuration?.competition
    )
    const comp = picked[0] ?? props.competitions[0]

    const root = [
        containerBackground(bg, "widget"),
        widgetURL(
            comp
                ? `accountable://competition/${comp.id}`
                : "accountable://competitions"
        )
    ]

    if (props.signedOut || !comp) {
        return (
            <VStack alignment="leading" spacing={4} modifiers={root}>
                <Text
                    modifiers={[
                        font({ size: 15, weight: "bold" }),
                        foregroundStyle(ink)
                    ]}
                >
                    Competitions
                </Text>
                <Text modifiers={[font({ size: 12 }), foregroundStyle(ink3)]}>
                    {props.signedOut
                        ? "Sign in to Accountable to see your standings."
                        : "Create or join a competition in Accountable to see the standings."}
                </Text>
                <Spacer />
            </VStack>
        )
    }

    const mono = (size: number, weight: "medium" | "bold" = "medium") =>
        font({ size, weight, design: "monospaced" })

    const rankBadge = (rank: number, size: number) => (
        <Text
            modifiers={[
                font({ size: size * 0.55, weight: "bold" }),
                foregroundStyle(rank <= 3 ? "#16100c" : ink3),
                frame({ width: size, height: size }),
                background(
                    rank <= 3 ? medal[rank - 1] : sunken,
                    shapes.circle()
                )
            ]}
        >
            {`${rank}`}
        </Text>
    )

    const header = (
        <HStack spacing={6}>
            <Text
                modifiers={[
                    font({ size: family === "systemSmall" ? 13 : 15, weight: "bold" }),
                    foregroundStyle(ink),
                    lineLimit(1)
                ]}
            >
                {comp.name}
            </Text>
            <Spacer />
            {family === "systemSmall" ? null : (
                <Text modifiers={[mono(11), foregroundStyle(ink3)]}>
                    {comp.goalCount > 0 ? "this week" : "streaks"}
                </Text>
            )}
        </HStack>
    )

    const myIndex = comp.members.findIndex((m) => m.me)

    if (family === "systemSmall") {
        const me = comp.members[myIndex]
        return (
            <VStack alignment="leading" spacing={8} modifiers={root}>
                {header}
                <Spacer />
                {me ? (
                    <HStack spacing={8}>
                        {rankBadge(myIndex + 1, 34)}
                        <Text
                            modifiers={[
                                font({ size: 13, weight: "medium" }),
                                foregroundStyle(ink3)
                            ]}
                        >
                            {`of ${comp.members.length}`}
                        </Text>
                    </HStack>
                ) : null}
                <VStack alignment="leading" spacing={2}>
                    {comp.goalCount > 0 ? (
                        <Text modifiers={[mono(12), foregroundStyle(ink)]}>
                            {`${me?.goalsHit ?? 0}/${comp.goalCount} on pace`}
                        </Text>
                    ) : null}
                    <Text modifiers={[mono(12), foregroundStyle(ink3)]}>
                        {`${me?.streak ?? 0}d streak`}
                    </Text>
                </VStack>
            </VStack>
        )
    }

    // Rows to show, leader first. If you're ranked below the cut, you take the
    // last row so the widget always says where you stand.
    const slots = family === "systemLarge" ? 8 : 3
    const ranked = comp.members.map((m, i) => ({ ...m, rank: i + 1 }))
    const rows =
        myIndex >= slots
            ? [...ranked.slice(0, slots - 1), ranked[myIndex]]
            : ranked.slice(0, slots)

    return (
        <VStack
            alignment="leading"
            spacing={family === "systemLarge" ? 10 : 7}
            modifiers={root}
        >
            {header}
            {rows.map((m) => (
                <HStack key={m.rank} spacing={8}>
                    {rankBadge(m.rank, 20)}
                    <Text
                        modifiers={[
                            font({ size: 10 }),
                            foregroundStyle(m.color)
                        ]}
                    >
                        ●
                    </Text>
                    <Text
                        modifiers={[
                            font({ size: 14, weight: m.me ? "bold" : "semibold" }),
                            foregroundStyle(ink),
                            lineLimit(1)
                        ]}
                    >
                        {m.me ? `${m.username} (you)` : m.username}
                    </Text>
                    <Spacer />
                    {comp.goalCount > 0 ? (
                        <Text modifiers={[mono(12, "bold"), foregroundStyle(ink)]}>
                            {`${m.goalsHit}/${comp.goalCount}`}
                        </Text>
                    ) : null}
                    <Text
                        modifiers={[
                            mono(12),
                            foregroundStyle(ink3),
                            frame({ width: 34, alignment: "trailing" })
                        ]}
                    >
                        {`${m.streak}d`}
                    </Text>
                </HStack>
            ))}
            <Spacer />
        </VStack>
    )
}

export default createWidget<
    CompetitionsWidgetProps,
    CompetitionsWidgetConfiguration
>("CompetitionStandings", CompetitionsWidget)
