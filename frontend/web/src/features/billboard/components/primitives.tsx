// Billboard building blocks. Everything is sized in `em`, so a component renders
// at normal size on the overview page and scales up with the base font size a
// full-screen widget sets from the viewport.

import type { ReactNode } from "react"
import { integrationVisual } from "../format"
import { IntegrationIcon } from "./IntegrationIcon"

/**
 * Integration tile — an em-sized `.source-tile`. Shows the integration's mark on
 * the neutral surface, or its tinted text glyph if it has none.
 */
export function Badge({
    integration,
    small = false
}: {
    integration: string
    small?: boolean
}) {
    const size = small
        ? "h-[2.15em] w-[2.15em] rounded-[0.65em] text-[0.8em]"
        : "h-[3.15em] w-[3.15em] rounded-[0.85em] text-[1em]"
    const icon = IntegrationIcon({ name: integration })
    const { glyph, tile } = integrationVisual(integration)
    return (
        <div
            className={`source-tile ${
                icon ? "has-icon" : tile ? `tile-${tile}` : ""
            } ${size}`}
        >
            {icon ?? <span>{glyph}</span>}
        </div>
    )
}

/** A colored dot, e.g. a competition member's swatch. */
export function Dot({
    color,
    size = "0.6em"
}: {
    color: string
    size?: string
}) {
    return (
        <span
            className="inline-block shrink-0 rounded-full"
            style={{ width: size, height: size, background: color }}
        />
    )
}

/** A habit's done-today indicator: a ring, filled with a check once done. */
export function CheckDot({
    done,
    fill,
    on,
    size = "2.7em"
}: {
    done: boolean
    fill: string
    /** The color the check is drawn in, over [fill]. */
    on: string
    size?: string
}) {
    return (
        <div
            role="img"
            aria-label={done ? "Done today" : "Not done today"}
            className="flex shrink-0 items-center justify-center rounded-full"
            style={{
                width: size,
                height: size,
                border: `0.15em solid ${fill}`,
                background: done ? fill : "transparent"
            }}
        >
            {done && (
                <svg viewBox="0 0 24 24" className="h-[55%] w-[55%]">
                    <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        fill="none"
                        stroke={on}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </div>
    )
}

/**
 * The mark inside a `.bar` for where its fill should have reached by now. It's
 * drawn in whichever color reads against what's under it — [on] where the fill
 * has reached it, ink over the bare track — so it shows on any fill, in either
 * theme.
 */
export function PaceTick({
    at,
    filled,
    on
}: {
    /** Position along the bar, 0–100. */
    at: number
    /** Whether the bar's fill has reached the tick. */
    filled: boolean
    /** A color that reads on top of the bar's fill. */
    on: string
}) {
    return (
        <div
            className="absolute inset-y-0 w-[max(2px,0.14em)] -translate-x-1/2"
            style={{
                left: `${Math.min(100, Math.max(0, at))}%`,
                background: filled ? on : "var(--ink)"
            }}
        />
    )
}

/** Centered muted message filling its box — loading, empty and error states. */
export function Placeholder({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-full min-h-[6em] items-center justify-center text-center text-[1.1em] text-ink-3">
            {children}
        </div>
    )
}
