// Android has no widget timelines (iOS's WidgetKit does). Instead each widget's
// timeline — the same entries the iOS widgets get: now, then each coming
// midnight — is saved to a file, and whenever Android redraws the widget (a
// sync, or its periodic update) the entry due at that moment is drawn. So the
// widget rolls over to a new day by itself, as on iOS, without the app running.

import { File, Paths } from "expo-file-system"

/** The widgets, by the name Android knows them as (see app.json). */
export type WidgetName =
    | "HabitsHeatmap"
    | "CompetitionStandings"
    | "GoalsProgress"

type Stored<P> = { entries: { at: number; props: P }[] }

function fileFor(name: WidgetName): File {
    return new File(Paths.document, `widget-${name}.json`)
}

/** Save [entries] (oldest first) as [name]'s timeline. */
export function saveTimeline<P>(
    name: WidgetName,
    entries: { date: Date; props: P }[]
): void {
    const stored: Stored<P> = {
        entries: entries.map((e) => ({ at: e.date.getTime(), props: e.props }))
    }
    const file = fileFor(name)
    if (!file.exists) file.create()
    file.write(JSON.stringify(stored))
}

/** The entry of [name]'s timeline due at [now], or null if there's none saved. */
export function currentProps<P>(name: WidgetName, now = Date.now()): P | null {
    try {
        const file = fileFor(name)
        if (!file.exists) return null
        const { entries } = JSON.parse(file.textSync()) as Stored<P>
        // The latest entry that has started; the first if none has yet.
        let due = entries[0]
        for (const e of entries) if (e.at <= now) due = e
        return due?.props ?? null
    } catch {
        return null
    }
}
