// Integration marks, ported from the app's primitives. Drawn in `currentColor`
// and sized to their tile, so they follow the theme and scale with the em-sized
// billboard.

import type { ReactNode, SVGProps } from "react"

const stroke: SVGProps<SVGSVGElement> = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
}

function Mark({
    children,
    ...props
}: SVGProps<SVGSVGElement> & { children: ReactNode }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="55%"
            height="55%"
            aria-hidden="true"
            className="relative"
            {...props}
        >
            {children}
        </svg>
    )
}

/** Brand mark for a known integration, or null so the caller falls back to a glyph. */
export function IntegrationIcon({ name }: { name: string }): ReactNode {
    switch (name) {
        case "github":
            return (
                <Mark fill="currentColor">
                    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.77.11 3.06.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16v3.2c0 .31.21.68.8.56 4.57-1.53 7.85-5.84 7.85-10.92C23.5 5.65 18.35.5 12 .5z" />
                </Mark>
            )
        case "leetcode":
            return (
                <Mark {...stroke}>
                    <polyline points="9 6 4 12 9 18" />
                    <polyline points="15 6 20 12 15 18" />
                    <line x1={14} y1={4} x2={10} y2={20} />
                </Mark>
            )
        case "apple_fitness":
            return (
                <Mark {...stroke}>
                    <path d="M6 4v16" />
                    <path d="M18 4v16" />
                    <path d="M3 8v8" />
                    <path d="M21 8v8" />
                    <path d="M6 12h12" />
                </Mark>
            )
        case "apple_sleep":
            return (
                <Mark {...stroke}>
                    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
                </Mark>
            )
        case "apple_steps":
            return (
                <Mark {...stroke}>
                    <path d="M7 3c1.7 0 2.5 1.8 2.5 4.5S8.8 13 7 13s-2.5-2.8-2.5-5.5S5.3 3 7 3Z" />
                    <path d="M5 16.5h4V19a2 2 0 0 1-4 0v-2.5Z" />
                    <path d="M17 7c1.7 0 2.5 1.8 2.5 4.5S18.8 17 17 17s-2.5-2.8-2.5-5.5S15.3 7 17 7Z" />
                    <path d="M15 20h4v.5a2 2 0 0 1-4 0V20Z" />
                </Mark>
            )
        case "screen_time":
            return (
                <Mark {...stroke}>
                    <path d="M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z" />
                    <path d="M12 8.5v3.5l2 1.5" />
                    <path d="M11 18.5h2" />
                </Mark>
            )
        default:
            return null
    }
}
