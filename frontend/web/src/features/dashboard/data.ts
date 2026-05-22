// Mock data for the dashboard feature, mirroring the design bundle.

import type { Activity, GoalData } from "./types"

export const GOALS: GoalData[] = [
    {
        g: "GH",
        tile: "ink",
        name: "Ship 5 commits / week",
        source: "GitHub · lkroon",
        n: 3,
        target: 5,
        unit: "commits",
        tone: "ink",
        vals: [1, 0, 2, 0, 0, 0, 0],
        dailyTarget: 1,
        delta: "+2",
        deltaPos: true,
        streak: 6,
        watchers: [
            { l: "M", c: "var(--coral)", dark: true },
            { l: "J", c: "var(--lime)" },
            { l: "S", c: "var(--ink)", dark: true }
        ],
        watchersLabel: "Marcus, Jess, Sam watching"
    },
    {
        g: "LC",
        tile: "lime",
        name: "Solve 3 LeetCode / day",
        source: "LeetCode · lukas-k",
        n: 1,
        target: 3,
        unit: "today",
        tone: "coral",
        vals: [3, 3, 4, 3, 2, 1, 0],
        dailyTarget: 3,
        delta: "−4",
        deltaPos: false,
        streak: 0,
        watchers: [{ l: "M", c: "var(--coral)", dark: true }],
        watchersLabel: "Marcus is checking"
    },
    {
        g: "♥︎",
        tile: "coral",
        name: "4 workouts / week",
        source: "Apple Health",
        n: 4,
        target: 4,
        unit: "workouts",
        tone: "lime",
        vals: [1, 0, 1, 0, 1, 1, 0],
        dailyTarget: 0.5,
        delta: "+1",
        deltaPos: true,
        streak: 12,
        watchers: [
            { l: "J", c: "var(--lime)" },
            { l: "A", c: "var(--ink)", dark: true }
        ],
        watchersLabel: "Sat Soreness Club"
    },
    {
        g: "⏱",
        tile: "",
        name: "Screen Time under 2h",
        source: "Apple Screen Time · Instagram",
        n: 1.4,
        target: 2,
        unit: "hours today",
        tone: "lime",
        vals: [1.8, 2.4, 1.1, 0.9, 1.6, 1.2, 1.4],
        dailyTarget: 2,
        delta: "−18m",
        deltaPos: true,
        streak: 4,
        watchers: [
            { l: "J", c: "var(--lime)" },
            { l: "P", c: "var(--coral)", dark: true },
            { l: "A", c: "var(--ink)", dark: true }
        ],
        watchersLabel: "6 of us trying not to scroll"
    }
]

export const ACTIVITY: Activity[] = [
    { user: "Marcus", userColor: "var(--coral)", userDark: true, action: "closed", detail: '"LeetCode #347 — Top K Elements"', time: "2m" },
    { user: "Jess", userColor: "var(--lime)", action: "logged a workout", detail: "Apple Health · Run 5.2km", time: "47m" },
    { user: "You", userColor: "var(--ink)", userDark: true, action: "pushed 2 commits to", detail: "accountable-web", time: "1h" },
    { user: "Sam", userColor: "var(--bg-sunken)", action: "missed", detail: "Screen Time goal · 2h 41m on Instagram", time: "3h" },
    { user: "Marcus", userColor: "var(--coral)", userDark: true, action: "extended his streak →", detail: "14 days", time: "6h" },
    { user: "Jess", userColor: "var(--lime)", action: "cheered you on", detail: '"go go go you got this"', time: "9h" }
]

export const STREAK_14: string[] = [
    "on", "on", "miss", "on", "on", "on", "on", "on", "on", "miss", "on", "on", "on", "today"
]
