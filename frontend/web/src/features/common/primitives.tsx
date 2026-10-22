// Shared design primitives used by the landing page.

import type { ReactNode } from "react"
import { Link } from "react-router-dom"

export type TileVariant = "ink" | "lime" | "coral" | ""

/** Wordmark lockup — a lime dot + "Accountable". */
export function AccLogo({ size = "md" }: { size?: "md" | "lg" | number }) {
    const s = typeof size === "number" ? size : size === "lg" ? 22 : 18
    return (
        <span className="acc-logo" style={{ fontSize: s }}>
            <span className="dot" />
            Accountable
        </span>
    )
}

/** Wordmark wrapped in a link back to the landing page. */
export function LogoLink({ size = "md" }: { size?: "md" | "lg" | number }) {
    return (
        <Link to="/" className="text-inherit no-underline">
            <AccLogo size={size} />
        </Link>
    )
}

/**
 * Striped geometric placeholder standing in for a source's brand mark.
 *
 * If [icon] is provided it renders inside a neutral tile (no [variant] tinting), so the
 * shape and color of the icon carry the meaning instead of a flat color swatch.
 */
export function SourceTile({
    label,
    variant = "",
    glyph,
    icon,
    size
}: {
    label: string
    variant?: TileVariant
    glyph?: string
    icon?: ReactNode
    /** "sm" renders the compact 30px tile. */
    size?: "sm"
}) {
    const sizeCls = size === "sm" ? " is-sm" : ""
    const cls = icon
        ? `source-tile has-icon${sizeCls}`
        : `source-tile ${variant ? "tile-" + variant : ""}${sizeCls}`
    return (
        <div className={cls}>
            {icon ?? <span>{glyph || label.slice(0, 2).toUpperCase()}</span>}
        </div>
    )
}
