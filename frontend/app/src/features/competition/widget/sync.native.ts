// Feeds the CompetitionStandings widget. The widget can't fetch or compute
// anything itself, so this loads every competition's members and current week,
// ranks them the same way the competition board does, and hands it over as a
// timeline: the standings now, plus the same totals re-scored at each coming
// midnight (the on-pace bar rises through the week, and a daily goal not hit
// by then counts as missed) and an all-reset entry at the next Monday. That way the widget stays honest when the app isn't opened,
// until the next sync replaces the timeline.

import {
    type ApiConfig,
    type CompetitionDetail,
    type CompetitionSummary,
    type CompetitionWeek,
    getCompetition,
    getCompetitionWeek
} from "@shared/index"
import { buildColorMap, onMemberFill } from "../colors"
import { computeStandings } from "../standings"
import type {
    CompetitionsWidgetCompetition,
    CompetitionsWidgetProps
} from "./CompetitionsWidget"
import { updateWidget as update, widgetAvailable } from "./output"

/** Competitions loaded per sync; each costs two requests. */
const MAX_COMPETITIONS = 10

type Loaded = {
    detail: CompetitionDetail
    week: CompetitionWeek
}

/** Widget props for [loaded], scored as of [now]. */
function propsFor(
    loaded: Loaded[],
    meID: string | undefined,
    now: number
): CompetitionsWidgetProps {
    return {
        competitions: loaded.map(
            ({ detail, week }): CompetitionsWidgetCompetition => {
                const colors = buildColorMap(detail.members)
                return {
                    id: detail.id,
                    name: detail.name,
                    goalCount: week.goals.length,
                    members: computeStandings(
                        detail,
                        week,
                        true,
                        colors,
                        now
                    ).map((s) => ({
                        username: s.username,
                        color: s.color,
                        onColor: onMemberFill(s.color),
                        goalsHit: s.goalsHit,
                        streak: s.streak,
                        me: s.userID === meID
                    }))
                }
            }
        ),
        signedOut: false
    }
}

/**
 * [week] as it starts out: nobody has logged anything yet, and every member
 * counts from Monday, however late they joined the week before.
 */
function emptied(week: CompetitionWeek): CompetitionWeek {
    return {
        ...week,
        goals: week.goals.map((g) => ({
            ...g,
            members: g.members.map((m) => ({
                ...m,
                vals: m.vals.map(() => 0),
                total: 0,
                firstDay: 0
            }))
        }))
    }
}

// Newer syncs win; an older one finishing late must not overwrite them.
let generation = 0

/** Load and push the standings for [competitions] to the home screen widget. */
export async function syncCompetitionsWidget(
    api: ApiConfig,
    competitions: CompetitionSummary[],
    meID: string | undefined
): Promise<void> {
    if (!widgetAvailable()) return
    const gen = ++generation

    const results = await Promise.all(
        competitions.slice(0, MAX_COMPETITIONS).map(async (c) => {
            try {
                const [detail, week] = await Promise.all([
                    getCompetition(api, c.id),
                    getCompetitionWeek(api, c.id, 0)
                ])
                return { detail, week }
            } catch {
                return null
            }
        })
    )
    if (gen !== generation) return
    // Keep the last good standings rather than dropping a competition that
    // merely failed to load this time.
    if (results.length > 0 && results.every((r) => r === null)) return
    const loaded = results.filter((r): r is Loaded => r !== null)

    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const day = (ahead: number) =>
        new Date(
            midnight.getFullYear(),
            midnight.getMonth(),
            midnight.getDate() + ahead
        )
    // Days until next Monday (1–7); getDay() is 0 for Sunday.
    const toMonday = (8 - now.getDay()) % 7 || 7

    const entries = [
        { date: now, props: propsFor(loaded, meID, now.getTime()) }
    ]
    for (let ahead = 1; ahead < toMonday; ahead++) {
        // Score at midday: the board reads the weekday in UTC.
        const noon = day(ahead).getTime() + 12 * 3_600_000
        entries.push({
            date: day(ahead),
            props: propsFor(loaded, meID, noon)
        })
    }
    const monday = day(toMonday)
    entries.push({
        date: monday,
        props: propsFor(
            loaded.map((l) => ({ ...l, week: emptied(l.week) })),
            meID,
            monday.getTime() + 12 * 3_600_000
        )
    })

    update(entries)
}

export function clearCompetitionsWidget(): void {
    generation++
    update([{ date: new Date(), props: { competitions: [], signedOut: true } }])
}
