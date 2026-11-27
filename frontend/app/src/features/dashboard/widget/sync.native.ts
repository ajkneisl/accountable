// Feeds the GoalsProgress widget. The widget can't fetch or compute anything
// itself, so this flattens the dashboard's goals into ready-to-paint cards and
// hands them over as a timeline: progress now, plus the same totals at each
// coming midnight (the new day starts empty and the on-pace bar rises through
// the week) and an all-reset entry at the next Monday. That way the widget stays
// honest when the app isn't opened, until the next sync replaces the timeline.

import { requiredDaysOf } from "@shared/index"
import type { Goal } from "@shared/index"
import {
    goalFill,
    goalKey,
    goalTitle,
    integrationVisual,
    isLimit,
    paceStatusFor,
    unitLabel,
    unitScale
} from "../types"
import type { GoalsWidgetProps } from "./GoalsWidget"
import { updateWidget as update, widgetAvailable } from "./output"

const DAY_MS = 86_400_000

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
        // Totals are painted as-is, so they go over in display units (hours of
        // sleep, not minutes); the bars only compare against dayTarget.
        const scale = unitScale(g.integration, g.metric)
        const shown = (v: number) => Math.round((v / scale) * 10) / 10
        const weekly =
            g.period === "WEEKLY"
                ? g.target
                : g.target * requiredDaysOf(g).length
        const fresh = day > 6
        const weekTotal = fresh ? 0 : g.weekTotal
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
        // Daily goals read per day (today's value against the daily target),
        // not as a ×7 weekly sum; pace still scores the whole week.
        const daily = g.period === "DAILY"
        const total = daily ? (fresh ? 0 : days[day]) : weekTotal
        return {
            id: goalKey(g),
            // Named after its competition too, so Edit Widget can tell it apart
            // from a personal goal on the same metric.
            name: g.competition
                ? `${goalTitle(g)} · ${g.competition.name}`
                : goalTitle(g),
            source: visual.sourceLabel,
            // As on the goal card.
            color: goalFill(g),
            total: shown(total),
            target: shown(daily ? g.target : weekly),
            unit: unitLabel(g.integration, g.metric),
            // Paced against the days already over, as on the goal card.
            status: paceStatusFor(g)(weekTotal, weekly, true, now),
            days,
            dayTarget: g.period === "DAILY" ? g.target : g.target / 7,
            limit: isLimit(g.integration, g.metric)
        }
    })
    return {
        goals: cards,
        onPace: cards.filter((c) => c.status === "onTrack").length,
        signedOut: false
    }
}

export function syncGoalsWidget(goals: Goal[]): void {
    if (!widgetAvailable()) return

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
            // Score at midday, safely inside that local day.
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
