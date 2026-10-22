// Feeds the GoalsProgress widget. The widget can't fetch or compute anything
// itself, so this flattens the dashboard's goals into ready-to-paint cards and
// hands them over as a timeline: progress now, plus the same totals at each
// coming midnight (the new day starts empty and the on-pace bar rises through
// the week) and an all-reset entry at the next Monday. That way the widget stays
// honest when the app isn't opened, until the next sync replaces the timeline.

import { isRunningInExpoGo } from "expo"
import type { Goal } from "@shared/index"
import {
    dayOfIsoWeek,
    goalKey,
    goalTitle,
    integrationVisual,
    unitLabel
} from "../types"
import type { GoalsWidgetProps } from "./GoalsWidget"

const DAY_MS = 86_400_000

/** Accent per integration tile, as on the goal card (lime when untinted). */
const TILE_COLOR: Record<string, string> = {
    ink: "#16100c",
    lime: "#a2eb3c",
    coral: "#fd6a3a"
}

type Widget = typeof import("./GoalsWidget").default

let widget: Widget | null | undefined

/**
 * The widget handle, or null where the native module doesn't exist. Expo Go
 * doesn't ship expo-widgets, and creating the widget there throws, so the module
 * is only loaded on demand in a development or release build.
 */
function getWidget(): Widget | null {
    if (widget === undefined) {
        try {
            widget = isRunningInExpoGo()
                ? null
                : (require("./GoalsWidget") as typeof import("./GoalsWidget"))
                      .default
        } catch {
            widget = null
        }
    }
    return widget
}

function update(entries: { date: Date; props: GoalsWidgetProps }[]) {
    try {
        getWidget()?.updateTimeline(entries)
    } catch {
        // A widget refresh is best effort and must never break the app.
    }
}

/**
 * Widget props for [goals] on weekday [day] (0 = Monday) of the week they were
 * loaded in, where [today] is the weekday they were loaded on; scored as of
 * [now]. A [day] of 7 is the following Monday, with everything reset.
 */
function propsFor(
    goals: Goal[],
    today: number,
    day: number,
    now: number
): GoalsWidgetProps {
    const cards = goals.map((g) => {
        const visual = integrationVisual(g.integration)
        const weekly = g.period === "WEEKLY" ? g.target : g.target * 7
        const fresh = day > 6
        const total = fresh ? 0 : g.weekTotal
        const days = Array.from({ length: 7 }, (_, i) =>
            fresh
                ? i === 0
                    ? 0
                    : -1
                : i <= today
                  ? (g.weekVals[i] ?? 0)
                  : i <= day
                    ? 0
                    : -1
        )
        return {
            id: goalKey(g),
            name: goalTitle(g),
            source: visual.sourceLabel,
            color: TILE_COLOR[visual.tile] ?? TILE_COLOR.lime,
            total,
            target: weekly,
            unit: unitLabel(g.integration, g.metric),
            // Prorated by how far into the week we are, as on the goal card.
            onPace: total >= (weekly * dayOfIsoWeek(now)) / 7,
            days,
            dayTarget: g.period === "DAILY" ? g.target : g.target / 7
        }
    })
    return {
        goals: cards,
        onPace: cards.filter((c) => c.onPace).length,
        signedOut: false
    }
}

export function syncGoalsWidget(goals: Goal[]): void {
    if (!getWidget()) return

    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const day = (ahead: number) =>
        new Date(
            midnight.getFullYear(),
            midnight.getMonth(),
            midnight.getDate() + ahead
        )
    // Weekday the payload's week was loaded on (0 = Monday); getDay() is 0 for Sunday.
    const today = (now.getDay() + 6) % 7
    // A payload from an earlier week would paint the wrong days; skip it.
    const monday = day(-today).getTime()
    if (goals.some((g) => Math.abs(g.weekStart - monday) > DAY_MS / 2)) return

    const entries = [
        { date: now, props: propsFor(goals, today, today, now.getTime()) }
    ]
    for (let d = today + 1; d <= 7; d++) {
        const at = day(d - today)
        entries.push({
            date: at,
            // Score at midday: pace reads the weekday in UTC.
            props: propsFor(goals, today, d, at.getTime() + 12 * 3_600_000)
        })
    }

    update(entries)
}

export function clearGoalsWidget(): void {
    update([
        { date: new Date(), props: { goals: [], onPace: 0, signedOut: true } }
    ])
}
