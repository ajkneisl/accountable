// SF Symbols exist only on iOS (see SymbolIcon.ios.tsx). Elsewhere each symbol
// the app uses gets a line glyph in the style of icons.tsx.

import type { ColorValue } from "react-native"
import Svg, { Circle, Path, Rect } from "react-native-svg"

/** The SF Symbols the app draws. Add a glyph below when adding one here. */
export type AppSymbol =
    | "house.fill"
    | "target"
    | "square.grid.2x2.fill"
    | "trophy.fill"
    | "figure.run"

export type SymbolIconProps = {
    name: AppSymbol
    size: number
    color: ColorValue
    /** A fixed square to draw in, instead of sizing to the glyph. */
    frame?: number
}

const stroke = (color: ColorValue) => ({
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none"
})

export function SymbolIcon({ name, size, color, frame }: SymbolIconProps) {
    const box = frame ?? size
    return (
        <Svg width={box} height={box} viewBox="0 0 24 24">
            {glyph(name, color)}
        </Svg>
    )
}

function glyph(name: AppSymbol, color: ColorValue) {
    const s = stroke(color)
    switch (name) {
        case "house.fill":
            return (
                <Path
                    d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z"
                    {...s}
                />
            )
        case "target":
            return (
                <>
                    <Circle cx={12} cy={12} r={8.5} {...s} />
                    <Circle cx={12} cy={12} r={4.5} {...s} />
                    <Circle cx={12} cy={12} r={1.2} fill={color} />
                </>
            )
        case "square.grid.2x2.fill":
            return (
                <>
                    <Rect x={3.5} y={3.5} width={7} height={7} rx={1.8} {...s} />
                    <Rect x={13.5} y={3.5} width={7} height={7} rx={1.8} {...s} />
                    <Rect x={3.5} y={13.5} width={7} height={7} rx={1.8} {...s} />
                    <Rect x={13.5} y={13.5} width={7} height={7} rx={1.8} {...s} />
                </>
            )
        case "trophy.fill":
            return (
                <Path
                    d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4.5v1A3 3 0 0 0 7.5 10M17 6h2.5v1a3 3 0 0 1-3 3M12 14v3.5M8.5 20.5h7M9.5 17.5h5"
                    {...s}
                />
            )
        case "figure.run":
            return (
                <>
                    <Circle cx={14.5} cy={4.5} r={1.8} fill={color} />
                    <Path
                        d="M6 11.5 9.5 8.5l4 1 2.5 3.5h3M13.5 9.5l-2.5 5 3.5 2.5-1 4M11 14.5 9 18H5.5"
                        {...s}
                    />
                </>
            )
    }
}
