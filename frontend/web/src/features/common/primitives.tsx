// Shared design primitives — reused across Landing, Dashboard, Competition, Register.

import { useAtomValue } from "jotai"
import { Link } from "react-router-dom"
import { isAuthenticatedAtom } from "../../auth"

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

/**
 * Wordmark wrapped in a link that points to the dashboard when signed in,
 * or the landing page otherwise. Used by the navbars.
 */
export function LogoLink({ size = "md" }: { size?: "md" | "lg" | number }) {
    const authed = useAtomValue(isAuthenticatedAtom)
    return (
        <Link to={authed ? "/dashboard" : "/"} className="text-inherit no-underline">
            <AccLogo size={size} />
        </Link>
    )
}

/** Striped geometric placeholder standing in for a source's brand mark. */
export function SourceTile({
    label,
    variant = "",
    glyph
}: {
    label: string
    variant?: TileVariant
    glyph?: string
}) {
    return (
        <div className={`source-tile ${variant ? "tile-" + variant : ""}`}>
            <span>{glyph || label.slice(0, 2).toUpperCase()}</span>
        </div>
    )
}
