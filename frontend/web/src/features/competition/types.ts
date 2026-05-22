// Shared types for the competition feature.

import type { TileVariant } from "../common/primitives"

export type Cat = {
    glyph: string
    tile: TileVariant
    label: string
    source: string
    won: number
    lost: number
    leader: "you" | "marcus" | "tie"
}

export type FeedEvent = {
    time: string
    who: "you" | "marcus"
    text: string
    pts: number
}

export type TrashMsg = {
    who: string
    name: string
    body: string
    time: string
    color: string
    dark?: boolean
    mine?: boolean
}
