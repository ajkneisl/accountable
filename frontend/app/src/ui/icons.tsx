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

/** Magnifying glass for search. */
export function SearchIcon({ color, size = 24 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx={11} cy={11} r={6.5} {...stroke(color)} />
            <Path d="M16 16l4.5 4.5" {...stroke(color)} />
        </Svg>
    )
}

/** Circled "i" for explanations. */
export function InfoIcon({ color, size = 24 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={9} {...stroke(color)} />
            <Path d="M12 11v5M12 8h.01" {...stroke(color)} />
        </Svg>
    )
}

/** Circular arrow for refresh / sync. */
export function RefreshIcon({ color, size = 24 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M20 11a8 8 0 1 0-2.3 5.7" {...stroke(color)} />
            <Path d="M20 4v7h-7" {...stroke(color)} />
        </Svg>
    )
}

/** Pencil for "edit". */
export function PencilIcon({ color, size = 24 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
                {...stroke(color)}
            />
            <Path d="M13.5 8.5l2 2" {...stroke(color)} />
        </Svg>
    )
}

/** Plus for "add". */
export function PlusIcon({ color, size = 24 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M12 5v14M5 12h14" {...stroke(color)} strokeWidth={2.4} />
        </Svg>
    )
}

/** Left chevron for "go back". */
export function BackChevronIcon({ color, size = 24 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M14.5 6l-6 6 6 6" {...stroke(color)} strokeWidth={2.4} />
        </Svg>
    )
}

/** Right chevron for "opens another screen". */
export function ChevronIcon({ color, size = 24 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M9.5 6l6 6-6 6" {...stroke(color)} />
        </Svg>
    )
}
