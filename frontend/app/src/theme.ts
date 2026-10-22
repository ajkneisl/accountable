// Design tokens, for the places NativeWind classes can't reach: SVG stroke/fill
// props, inline style colors, and navigator options.
//
// Mirrors web/src/features/common/theme.css. That sheet expresses the palette in
// oklch(), which React Native can't parse, so these are the sRGB equivalents (the
// two out-of-gamut greens, `lime` and `limeSoft`, are chroma-clipped to sRGB).

export const colors = {
    bg: "#f8f5ef",
    bgCard: "#ffffff",
    bgSunken: "#efeae2",
    ink: "#16100c",
    ink2: "#423c37",
    ink3: "#7b736c",
    line: "#ddd6cf",
    line2: "#e9e4de",

    lime: "#a2eb3c",
    limeInk: "#243b00",
    limeSoft: "#d5f9b2",

    coral: "#fd6a3a",
    coralSoft: "#ffe5dc",
    coralInk: "#7f2400",

    indigo: "#2e40a3"
} as const

export const radius = {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24
} as const

/** Tint used by tiles, charts, and bars. Mirrors web's `TileVariant`. */
export type Tone = "ink" | "lime" | "coral" | ""

/** Resolve a {@link Tone} to the color its filled elements paint with. */
export function toneColor(tone: Tone): string {
    switch (tone) {
        case "lime":
            return colors.lime
        case "coral":
            return colors.coral
        default:
            return colors.ink
    }
}
