// Line glyphs. Stroked 24px outlines, tinted by the caller.

import type { ColorValue } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

type IconProps = { color: ColorValue; size?: number }

const stroke = (color: ColorValue) => ({
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none"
})

/** Gear glyph for settings. */
export function GearIcon({ color, size = 24 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={3} {...stroke(color)} />
            <Path
                d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
                {...stroke(color)}
            />
        </Svg>
    )
}

/** Check mark for done states. */
export function CheckIcon({ color, size = 24 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                d="M5 12.5l4.5 4.5L19 7.5"
                {...stroke(color)}
                strokeWidth={2.6}
            />
        </Svg>
    )
}
