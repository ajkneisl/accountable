// Turning health samples into the per-day figures the backend imports. Shared
// by Apple Health (appleHealth.ios.ts) and Health Connect
// (appleHealth.android.ts), so a night's sleep or a day's steps total the same
// way on either phone.

import type { ImportedSleepDay } from "@shared/index"

export const DAY_MS = 86_400_000

/** Most workouts the backend accepts per import call. */
export const IMPORT_PAGE = 500

/** Most sleep (or step, or distance) days the backend accepts per import call. */
export const DAY_IMPORT_PAGE = 400

/** The backend's per-day step cap; anything above is junk data. */
export const MAX_STEPS_PER_DAY = 250_000

/** The backend's per-day distance cap, in metres. */
export const MAX_METERS_PER_DAY = 300_000

/** Post [items] in pages of [size]. Resolves to the total the backend reports imported. */
export async function importInPages<T>(
    items: T[],
    size: number,
    post: (page: T[]) => Promise<{ imported: number }>
): Promise<number> {
    let imported = 0
    for (let i = 0; i < items.length; i += size)
        imported += (await post(items.slice(i, i + size))).imported
    return imported
}

export type Span = [start: number, end: number]

/** Merge overlapping spans, so sleep recorded by both a watch and a phone counts once. */
export function mergeSpans(spans: Span[]): Span[] {
    const merged: Span[] = []
    for (const [start, end] of [...spans].sort((a, b) => a[0] - b[0])) {
        const last = merged[merged.length - 1]
        if (last && start <= last[1]) last[1] = Math.max(last[1], end)
        else merged.push([start, end])
    }
    return merged
}

/** Local midnight of the day containing [ms]. */
export function localDayStart(ms: number): number {
    const d = new Date(ms)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Local midnight of the day after [day]; calendar-based, so DST-safe. */
export function nextDay(day: number): number {
    const d = new Date(day)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
}

/**
 * Sleep separated by a longer wake than this is a separate sleep (an evening
 * nap, then the night); anything shorter is waking up during the night.
 */
const SLEEP_GAP_MS = 3 * 60 * 60_000

/**
 * Minutes per local day across [spans], keyed by local midnight. Spans are
 * grouped into sleeps first, and each sleep counts toward the day it ended on,
 * so a night belongs to the morning after — including the part before a brief
 * wake-up before midnight, which on its own would land on the day before.
 */
export function minutesByDay(spans: Span[]): Map<number, ImportedSleepDay> {
    const days = new Map<number, ImportedSleepDay>()
    const addSleep = (end: number, minutes: number) => {
        const day = localDayStart(end)
        const total = days.get(day) ?? { endedAt: end, minutes: 0 }
        total.minutes += minutes
        total.endedAt = Math.max(total.endedAt, end)
        days.set(day, total)
    }

    // The sleep being built: when its latest span ended, and its minutes so far.
    let sleepEnd: number | null = null
    let sleepMinutes = 0
    for (const [start, end] of mergeSpans(spans)) {
        if (sleepEnd !== null && start - sleepEnd > SLEEP_GAP_MS) {
            addSleep(sleepEnd, sleepMinutes)
            sleepMinutes = 0
        }
        sleepEnd = end
        sleepMinutes += (end - start) / 60_000
    }
    if (sleepEnd !== null) addSleep(sleepEnd, sleepMinutes)
    return days
}

/**
 * One sleep figure for every local day from [since] to today. Time asleep wins
 * over time in bed for any day that has both; a day with neither is sent as 0,
 * so a day whose sleep was deleted (or moved to another day) is corrected too.
 */
export function sleepDays(
    asleep: Span[],
    inBed: Span[],
    since: number
): ImportedSleepDay[] {
    const totals = new Map([...minutesByDay(inBed), ...minutesByDay(asleep)])
    const days: ImportedSleepDay[] = []
    const today = localDayStart(Date.now())
    for (let day = localDayStart(since); day <= today; day = nextDay(day)) {
        const t = totals.get(day)
        days.push({
            // Local noon for an empty day, which files it under the same date.
            endedAt: t?.endedAt ?? day + DAY_MS / 2,
            minutes: Math.min(24 * 60, Math.round(t?.minutes ?? 0))
        })
    }
    return days
}
