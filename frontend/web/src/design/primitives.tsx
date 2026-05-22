// Shared design primitives — reused across Landing, Dashboard, Competition, Onboarding.

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
