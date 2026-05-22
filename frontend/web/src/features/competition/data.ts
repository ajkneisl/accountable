// Mock data for the competition feature, mirroring the design bundle.

import type { Cat, FeedEvent, TrashMsg } from "./types"

export const CATS: Cat[] = [
    { glyph: "GH", tile: "ink", label: "Commits", source: "GitHub", won: 8, lost: 5, leader: "you" },
    { glyph: "LC", tile: "lime", label: "LeetCode", source: "Daily", won: 2, lost: 6, leader: "marcus" },
    { glyph: "♥︎", tile: "coral", label: "Workouts", source: "Apple Health", won: 3, lost: 0, leader: "you" },
    { glyph: "⏱", tile: "", label: "Screen Time", source: "Under 2h/day", won: 1, lost: 0, leader: "tie" }
]

export const YOU_DAILY = [3, 4, 7, 0, 0, 0, 0]
export const MAR_DAILY = [2, 3, 6, 0, 0, 0, 0]

export const FEED: FeedEvent[] = [
    { time: "6:42p", who: "you", text: "closed LeetCode #347 — Top K Frequent", pts: 1 },
    { time: "5:11p", who: "marcus", text: "closed LeetCode #146 — LRU Cache", pts: 1 },
    { time: "2:08p", who: "you", text: "pushed 2 commits to accountable-web", pts: 2 },
    { time: "12:30p", who: "marcus", text: "logged a workout · 32min lift", pts: 1 },
    { time: "11:14a", who: "you", text: "logged a workout · Run 5.2km", pts: 1 },
    { time: "9:02a", who: "marcus", text: "pushed 1 commit to slimd", pts: 1 }
]

export const TRASH: TrashMsg[] = [
    { who: "M", name: "Marcus", body: "you got lucky on the run today. just wait until friday", time: "4:21p", color: "var(--coral)", dark: true },
    { who: "L", name: "You", body: "staying ahead is the easy part. catching up is the hard part 😎", time: "4:38p", color: "var(--lime)", dark: false, mine: true },
    { who: "M", name: "Marcus", body: "tomorrow is leetcode day i WILL close that gap", time: "5:02p", color: "var(--coral)", dark: true },
    { who: "J", name: "Jess", body: "i love how unhinged you both are about this btw", time: "5:14p", color: "var(--lime)" }
]

export const STAKES: { l: string; v: string; sub: string }[] = [
    { l: "STAKES", v: "Loser ☕ × 1 wk", sub: "agreed on Sun" },
    { l: "POINTS", v: "1 / source / day", sub: "caps at 2/day per src" },
    { l: "JUDGE", v: "Auto + Jess", sub: "ties go to Jess" },
    { l: "LAST MEET", v: "You won 18 — 16", sub: "week 18 · streak: 2" }
]
