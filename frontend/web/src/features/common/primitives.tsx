// Shared design primitives — reused across Landing, Dashboard, Competition, Register.

import type { ReactNode } from "react"
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
    icon
}: {
    label: string
    variant?: TileVariant
    glyph?: string
    icon?: ReactNode
}) {
    const cls = icon
        ? "source-tile has-icon"
        : `source-tile ${variant ? "tile-" + variant : ""}`
    return (
        <div className={cls}>
            {icon ?? <span>{glyph || label.slice(0, 2).toUpperCase()}</span>}
        </div>
    )
}

function GitHubIcon() {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.77.11 3.06.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16v3.2c0 .31.21.68.8.56 4.57-1.53 7.85-5.84 7.85-10.92C23.5 5.65 18.35.5 12 .5z" />
        </svg>
    )
}

function LeetCodeIcon() {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="9 6 4 12 9 18" />
            <polyline points="15 6 20 12 15 18" />
            <line x1="14" y1="4" x2="10" y2="20" />
        </svg>
    )
}

function WorkoutIcon() {
    return (
        <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M6 4v16" />
            <path d="M18 4v16" />
            <path d="M3 8v8" />
            <path d="M21 8v8" />
            <path d="M6 12h12" />
        </svg>
    )
}

/**
 * Brand-style icon for a known integration name, sized for [SourceTile]. Returns null for
 * unrecognized names so the caller falls back to the text glyph.
 */
export function IntegrationIcon({ name }: { name: string }): ReactNode {
    switch (name) {
        case "github":
            return <GitHubIcon />
        case "leetcode":
            return <LeetCodeIcon />
        case "apple_fitness":
            return <WorkoutIcon />
        default:
            return null
    }
}

/** Small inline loading indicator. Sized to sit next to an eyebrow label or icon. */
export function Spinner({ size = 14 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className="animate-spin text-ink-3"
            aria-label="Loading"
            role="status"
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="3"
                fill="none"
            />
            <path
                d="M21 12a9 9 0 0 1-9 9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    )
}
