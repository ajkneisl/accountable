// Shared types for the dashboard feature.

import type { TileVariant } from "../common/primitives"

export type Watcher = { l: string; c: string; dark?: boolean }

export type GoalData = {
    g: string
    tile: TileVariant
    name: string
    source: string
    n: number
    target: number
    unit: string
    tone: TileVariant
    vals: number[]
    dailyTarget: number
    delta: string
    deltaPos: boolean
    streak: number
    watchers: Watcher[]
    watchersLabel: string
}

export type Activity = {
    user: string
    userColor: string
    userDark?: boolean
    action: string
    detail: string
    time: string
}
