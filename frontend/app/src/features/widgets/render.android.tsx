// The Android home screen widgets: Habits, Competitions and Goals, drawn with
// react-native-android-widget from the same props the iOS widgets get (see each
// feature's widget/sync.native.ts). Android has no widget families, so the
// layout follows the widget's size: narrow shows one item, wide two (or four
// rows of standings), tall a 2×2 grid (or eight rows). Unlike iOS there's no
// per-widget picker: each shows the first habits, competition or goals.
//
// Heatmaps and bar strips are drawn as one SVG each, not a view per cell, so a
// widget stays well inside what Android lets a widget hold.

import {
    FlexWidget,
    requestWidgetUpdate,
    SvgWidget,
    TextWidget,
    type WidgetInfo,
    type WidgetRepresentation,
    type WidgetTaskHandlerProps
} from "react-native-android-widget"
import type {
    CompetitionsWidgetMember,
    CompetitionsWidgetProps
} from "../competition/widget/CompetitionsWidget"
import type { GoalsWidgetProps } from "../dashboard/widget/GoalsWidget"
import type { HabitsWidgetProps } from "../habits/widget/HabitsWidget"
import { currentProps, type WidgetName } from "./timeline.android"

type HexColor = `#${string}`

/** The app's paper and ink, as the iOS widgets use them. */
function palette(dark: boolean) {
    const ink: HexColor = dark ? "#f8f5ef" : "#16100c"
    return {
        bg: (dark ? "#16100c" : "#f8f5ef") as HexColor,
        ink,
        // Lifted on dark so secondary text keeps its contrast.
        ink3: (dark ? "#958c84" : "#7b736c") as HexColor,
        empty: (dark ? "#2b2520" : "#e9e4de") as HexColor,
        coral: "#fd6a3a" as HexColor,
        // The palette is tuned for the light paper: on dark, the Ink accent is
        // the background itself and Indigo nearly so, so lift both.
        fill: (hex: string): HexColor =>
            (!dark
                ? hex
                : hex === "#16100c"
                  ? ink
                  : hex === "#2e40a3"
                    ? "#8e9cf0"
                    : hex) as HexColor,
        // An accent used as text: Lime and Coral are too pale on the paper.
        text: (hex: string): HexColor =>
            (dark
                ? hex === "#16100c"
                    ? ink
                    : hex === "#2e40a3"
                      ? "#8e9cf0"
                      : hex
                : hex === "#a2eb3c"
                  ? "#4c7a0c"
                  : hex === "#fd6a3a"
                    ? "#d9531e"
                    : hex) as HexColor
    }
}

type Palette = ReturnType<typeof palette>

const PAD = 14
const GAP = 10

/** One item when narrow, two side by side when wide, a 2×2 grid when also tall. */
function slotsFor(width: number, height: number): 1 | 2 | 4 {
    if (width < 220) return 1
    return height >= 250 ? 4 : 2
}

function Root(props: { c: Palette; uri: string; children: React.ReactNode }) {
    return (
        <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: props.uri }}
            style={{
                height: "match_parent",
                width: "match_parent",
                flexDirection: "column",
                backgroundColor: props.c.bg,
                borderRadius: 22,
                padding: PAD
            }}
        >
            {props.children}
        </FlexWidget>
    )
}

function Message({
    c,
    title,
    body
}: {
    c: Palette
    title: string
    body: string
}) {
    return (
        <FlexWidget style={{ flexDirection: "column", flexGap: 4 }}>
            <TextWidget
                text={title}
                style={{ fontSize: 15, fontWeight: "700", color: c.ink }}
            />
            <TextWidget text={body} style={{ fontSize: 12, color: c.ink3 }} />
        </FlexWidget>
    )
}

/** Takes the row's spare width, for a text that should truncate rather than push. */
function Stretch({ children }: { children: React.ReactNode }) {
    return (
        <FlexWidget style={{ flex: 1, flexDirection: "row" }}>
            {children}
        </FlexWidget>
    )
}

/** Lay [cards] out in rows of [perRow], [GAP] apart. */
function Grid({ perRow, cards }: { perRow: number; cards: React.ReactNode[] }) {
    const rows: React.ReactNode[][] = []
    for (let i = 0; i < cards.length; i += perRow)
        rows.push(cards.slice(i, i + perRow))
    return (
        <FlexWidget
            style={{
                flex: 1,
                flexDirection: "column",
                flexGap: GAP,
                width: "match_parent"
            }}
        >
            {rows.map((row, r) => (
                <FlexWidget
                    key={r}
                    style={{
                        flex: 1,
                        flexDirection: "row",
                        flexGap: GAP,
                        width: "match_parent"
                    }}
                >
                    {row}
                </FlexWidget>
            ))}
        </FlexWidget>
    )
}

// ------------------------------------------------------------------- habits

function heatmapSvg(weeks: number[][], cell: number, fill: string, c: Palette) {
    const gap = 3
    const w = weeks.length * cell + (weeks.length - 1) * gap
    const h = 7 * cell + 6 * gap
    const rects = weeks
        .flatMap((week, x) =>
            week.map((d, y) =>
                d < 0
                    ? ""
                    : `<rect x="${x * (cell + gap)}" y="${y * (cell + gap)}" width="${cell}" height="${cell}" rx="2.5" fill="${d ? fill : c.empty}"/>`
            )
        )
        .join("")
    return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rects}</svg>`,
        w,
        h
    }
}

function HabitsWidget({
    props,
    c,
    width,
    height
}: {
    props: HabitsWidgetProps | null
    c: Palette
    width: number
    height: number
}) {
    const uri = "accountable://habits"
    if (!props || props.signedOut || props.habitCount === 0)
        return (
            <Root c={c} uri={uri}>
                <Message
                    c={c}
                    title="Habits"
                    body={
                        !props
                            ? "Open Beacc to load your habits."
                            : props.signedOut
                              ? "Sign in to Beacc to see your habits."
                              : "Add a habit in Beacc to start your heatmap."
                    }
                />
            </Root>
        )

    const slots = slotsFor(width, height)
    const perRow = slots === 1 ? 1 : 2
    const rowCount = slots === 4 ? 2 : 1
    const headerH = slots === 4 ? 26 : 0
    const cols = slots === 1 ? 8 : 9
    const cardW = (width - 2 * PAD - GAP * (perRow - 1)) / perRow
    const cardH = (height - 2 * PAD - headerH - GAP * (rowCount - 1)) / rowCount
    // The largest square cells the card has room for, under its title row.
    const cell = Math.max(
        4,
        Math.floor(
            Math.min((cardW - 3 * (cols - 1)) / cols, (cardH - 24 - 3 * 6) / 7)
        )
    )

    const cards = props.habits.slice(0, slots).map((h) => {
        const map = heatmapSvg(h.weeks.slice(-cols), cell, c.fill(h.color), c)
        const streak =
            h.streak > 0
                ? h.doneToday
                    ? `✓ ${h.streak}d`
                    : `${h.streak}d`
                : h.doneToday
                  ? "✓"
                  : ""
        return (
            <FlexWidget
                key={h.id}
                style={{ flex: 1, flexDirection: "column", flexGap: 6 }}
            >
                <FlexWidget
                    style={{
                        flexDirection: "row",
                        width: "match_parent",
                        alignItems: "center"
                    }}
                >
                    <Stretch>
                        <TextWidget
                            text={h.name}
                            maxLines={1}
                            truncate="END"
                            style={{
                                fontSize: 13,
                                fontWeight: "700",
                                color: c.ink
                            }}
                        />
                    </Stretch>
                    <TextWidget
                        text={streak}
                        style={{
                            fontSize: 11,
                            fontFamily: "monospace",
                            color: h.doneToday ? c.text(h.color) : c.ink3
                        }}
                    />
                </FlexWidget>
                <SvgWidget
                    svg={map.svg}
                    style={{ width: map.w, height: map.h }}
                />
            </FlexWidget>
        )
    })

    return (
        <Root c={c} uri={uri}>
            {slots === 4 ? (
                <TextWidget
                    text={`${props.doneToday} of ${props.habitCount} done today`}
                    style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: c.ink,
                        marginBottom: 10
                    }}
                />
            ) : null}
            <Grid perRow={perRow} cards={cards} />
        </Root>
    )
}

// -------------------------------------------------------------------- goals

function barsSvg(
    days: number[],
    dayTarget: number,
    limit: boolean,
    fill: string,
    w: number,
    h: number,
    c: Palette
) {
    const gap = 3
    const bw = (w - gap * 6) / 7
    const max = Math.max(dayTarget, ...days, 1) * 1.2
    const bars = days
        .map((v, i) => {
            if (v < 0) return ""
            const hit = limit ? v <= dayTarget : v >= dayTarget
            const bh = Math.max(2, (v / max) * h)
            return `<rect x="${i * (bw + gap)}" y="${h - bh}" width="${bw}" height="${bh}" rx="2" fill="${hit ? fill : c.empty}"/>`
        })
        .join("")
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bars}</svg>`
}

function GoalsWidget({
    props,
    c,
    width,
    height
}: {
    props: GoalsWidgetProps | null
    c: Palette
    width: number
    height: number
}) {
    const uri = "accountable://goals"
    if (!props || props.signedOut || props.goals.length === 0)
        return (
            <Root c={c} uri={uri}>
                <Message
                    c={c}
                    title="Goals"
                    body={
                        !props
                            ? "Open Beacc to load your goals."
                            : props.signedOut
                              ? "Sign in to Beacc to see your goals."
                              : "Add a goal in Beacc to track it here."
                    }
                />
            </Root>
        )

    const slots = slotsFor(width, height)
    const perRow = slots === 1 ? 1 : 2
    const rowCount = slots === 4 ? 2 : 1
    const headerH = slots === 4 ? 26 : 0
    const cardW = Math.floor((width - 2 * PAD - GAP * (perRow - 1)) / perRow)
    const cardH = (height - 2 * PAD - headerH - GAP * (rowCount - 1)) / rowCount
    // What's left under the name and the total, above the status line: about
    // 92dp of text at the default font size, with room for a larger one.
    const barsH = Math.max(12, Math.floor(cardH - 92))

    const cards = props.goals.slice(0, slots).map((g) => {
        const tone = c.text(g.status === "behind" ? c.coral : g.color)
        const fill = c.fill(g.status === "behind" ? c.coral : g.color)
        return (
            <FlexWidget
                key={g.id}
                style={{ flex: 1, flexDirection: "column", flexGap: 2 }}
            >
                <TextWidget
                    text={g.name}
                    maxLines={1}
                    truncate="END"
                    style={{ fontSize: 13, fontWeight: "700", color: c.ink }}
                />
                <FlexWidget
                    style={{
                        flexDirection: "row",
                        alignItems: "flex-end",
                        flexGap: 4
                    }}
                >
                    <TextWidget
                        text={`${g.total}`}
                        style={{
                            fontSize: 22,
                            fontWeight: "700",
                            fontFamily: "monospace",
                            color: c.ink
                        }}
                    />
                    <TextWidget
                        text={`/ ${g.target} ${g.unit}`}
                        maxLines={1}
                        truncate="END"
                        style={{ fontSize: 11, color: c.ink3, marginBottom: 3 }}
                    />
                </FlexWidget>
                <SvgWidget
                    svg={barsSvg(
                        g.days,
                        g.dayTarget,
                        g.limit,
                        fill,
                        cardW,
                        barsH,
                        c
                    )}
                    style={{ width: cardW, height: barsH, marginTop: 4 }}
                />
                <TextWidget
                    text={
                        g.status === "onTrack"
                            ? "on pace"
                            : g.status === "atRisk"
                              ? "at risk"
                              : "behind"
                    }
                    style={{
                        fontSize: 11,
                        fontWeight: "700",
                        fontFamily: "monospace",
                        color: tone,
                        marginTop: 2
                    }}
                />
            </FlexWidget>
        )
    })

    return (
        <Root c={c} uri={uri}>
            {slots === 4 ? (
                <TextWidget
                    text={`${props.onPace} of ${props.goals.length} on pace`}
                    style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: c.ink,
                        marginBottom: 10
                    }}
                />
            ) : null}
            <Grid perRow={perRow} cards={cards} />
        </Root>
    )
}

// ------------------------------------------------------------- competitions

function RankBadge({
    rank,
    member,
    size
}: {
    rank: number
    member: CompetitionsWidgetMember
    size: number
}) {
    return (
        <FlexWidget
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: member.color as HexColor,
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <TextWidget
                text={`${rank}`}
                style={{
                    fontSize: Math.round(size * 0.45),
                    fontWeight: "700",
                    fontFamily: "monospace",
                    color: member.onColor as HexColor
                }}
            />
        </FlexWidget>
    )
}

function CompetitionsWidget({
    props,
    c,
    width,
    height
}: {
    props: CompetitionsWidgetProps | null
    c: Palette
    width: number
    height: number
}) {
    const comp = props?.competitions[0]
    const uri = comp
        ? `accountable://competition/${comp.id}`
        : "accountable://competitions"
    if (!props || props.signedOut || !comp)
        return (
            <Root c={c} uri={uri}>
                <Message
                    c={c}
                    title="Competitions"
                    body={
                        !props
                            ? "Open Beacc to load your standings."
                            : props.signedOut
                              ? "Sign in to Beacc to see your standings."
                              : "Create or join a competition in Beacc to see the standings."
                    }
                />
            </Root>
        )

    const goals = (n: number) =>
        `${n}/${comp.goalCount} ${comp.goalCount === 1 ? "goal" : "goals"}`
    const myIndex = comp.members.findIndex((m) => m.me)
    const small = width < 220
    const header = (
        <FlexWidget
            style={{
                flexDirection: "row",
                width: "match_parent",
                alignItems: "center",
                marginBottom: 8
            }}
        >
            <Stretch>
                <TextWidget
                    text={comp.name}
                    maxLines={1}
                    truncate="END"
                    style={{ fontSize: 14, fontWeight: "700", color: c.ink }}
                />
            </Stretch>
            {small ? null : (
                <TextWidget
                    text={comp.goalCount > 0 ? "this week" : "streaks"}
                    style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: c.ink3
                    }}
                />
            )}
        </FlexWidget>
    )

    if (small) {
        const me = comp.members[myIndex]
        return (
            <Root c={c} uri={uri}>
                {header}
                <FlexWidget style={{ flex: 1 }} />
                {me ? (
                    <FlexWidget
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flexGap: 8,
                            marginBottom: 6
                        }}
                    >
                        <RankBadge rank={myIndex + 1} member={me} size={34} />
                        <TextWidget
                            text={`of ${comp.members.length}`}
                            style={{ fontSize: 13, color: c.ink3 }}
                        />
                    </FlexWidget>
                ) : null}
                {comp.goalCount > 0 ? (
                    <TextWidget
                        text={`${goals(me?.goalsHit ?? 0)} on pace`}
                        style={{
                            fontSize: 12,
                            fontFamily: "monospace",
                            color: c.ink
                        }}
                    />
                ) : null}
                <TextWidget
                    text={
                        (me?.streak ?? 0) > 0
                            ? `${me?.streak}-day streak`
                            : "No streak"
                    }
                    style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        color: c.ink3
                    }}
                />
            </Root>
        )
    }

    // Rows to show, leader first. Ranked below the cut, you take the last row,
    // so the widget always says where you stand.
    const slots = height >= 250 ? 8 : 4
    const ranked = comp.members.map((m, i) => ({ ...m, rank: i + 1 }))
    const rows =
        myIndex >= slots
            ? [...ranked.slice(0, slots - 1), ranked[myIndex]]
            : ranked.slice(0, slots)
    const rowH = Math.max(
        18,
        Math.min(30, Math.floor((height - 2 * PAD - 30) / slots) - 4)
    )

    return (
        <Root c={c} uri={uri}>
            {header}
            <FlexWidget
                style={{
                    flexDirection: "column",
                    flexGap: 4,
                    width: "match_parent"
                }}
            >
                {rows.map((m) => (
                    <FlexWidget
                        key={m.rank}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flexGap: 8,
                            width: "match_parent",
                            height: rowH
                        }}
                    >
                        <RankBadge rank={m.rank} member={m} size={rowH} />
                        <Stretch>
                            <TextWidget
                                text={m.me ? `${m.username} (you)` : m.username}
                                maxLines={1}
                                truncate="END"
                                style={{
                                    fontSize: 14,
                                    fontWeight: m.me ? "700" : "600",
                                    color: c.ink
                                }}
                            />
                        </Stretch>
                        {comp.goalCount > 0 ? (
                            <TextWidget
                                text={goals(m.goalsHit)}
                                style={{
                                    fontSize: 12,
                                    fontWeight: "700",
                                    fontFamily: "monospace",
                                    color: c.ink
                                }}
                            />
                        ) : null}
                        <TextWidget
                            text={`${m.streak}d`}
                            style={{
                                width: 34,
                                textAlign: "right",
                                fontSize: 12,
                                fontFamily: "monospace",
                                color: c.ink3
                            }}
                        />
                    </FlexWidget>
                ))}
            </FlexWidget>
        </Root>
    )
}

// ---------------------------------------------------------------- rendering

/** [name] in both appearances, from the timeline entry due now. */
function renderFor(name: WidgetName, info: WidgetInfo): WidgetRepresentation {
    const draw = (dark: boolean) => {
        const c = palette(dark)
        const size = { c, width: info.width, height: info.height }
        switch (name) {
            case "HabitsHeatmap":
                return (
                    <HabitsWidget
                        props={currentProps<HabitsWidgetProps>(name)}
                        {...size}
                    />
                )
            case "GoalsProgress":
                return (
                    <GoalsWidget
                        props={currentProps<GoalsWidgetProps>(name)}
                        {...size}
                    />
                )
            case "CompetitionStandings":
                return (
                    <CompetitionsWidget
                        props={currentProps<CompetitionsWidgetProps>(name)}
                        {...size}
                    />
                )
        }
    }
    return { light: draw(false), dark: draw(true) }
}

/** Redraw every placed [name] widget from its saved timeline, after a sync. */
export async function redrawWidget(name: WidgetName): Promise<void> {
    try {
        await requestWidgetUpdate({
            widgetName: name,
            renderWidget: (info) => renderFor(name, info)
        })
    } catch {
        // No widget placed, or the module is missing (Expo Go): nothing to draw.
    }
}

/**
 * Android asks for a widget when it's placed, resized, or due for its periodic
 * update. Taps open a deep link, so there's no click to handle here.
 */
export async function widgetTaskHandler({
    widgetInfo,
    widgetAction,
    renderWidget
}: WidgetTaskHandlerProps): Promise<void> {
    if (widgetAction === "WIDGET_DELETED" || widgetAction === "WIDGET_CLICK")
        return
    renderWidget(renderFor(widgetInfo.widgetName as WidgetName, widgetInfo))
}
