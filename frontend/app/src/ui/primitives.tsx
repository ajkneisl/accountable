// Shared design primitives — the native counterpart of web/src/features/common
// (theme.css's component classes plus primitives.tsx).
//
// The web build gets .btn / .card / .chip / .eyebrow from a stylesheet; React
// Native has no cascade, so each one is a component here.

import { type ReactNode } from "react"
import {
    ActivityIndicator,
    Platform,
    Pressable,
    Text,
    TextInput,
    type TextInputProps,
    View,
    type ViewProps
} from "react-native"
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg"
import { colors, type Tone } from "../theme"

export type { Tone }
/** Retained under the web's name so ported components read the same. */
export type TileVariant = Tone

/** Platform monospace stack — stands in for the web's "Geist Mono". */
export const MONO = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace"
}) as string

/* ------------------------------------------------------------------ layout */

/** White rounded surface with a hairline border. Mirrors `.card`. */
export function Card({
    className = "",
    children,
    ...rest
}: ViewProps & { className?: string; children?: ReactNode }) {
    return (
        <View
            className={`rounded-lg border border-line-2 bg-bg-card ${className}`}
            {...rest}
        >
            {children}
        </View>
    )
}

/** Small section label above a card's content or a form field. */
export function Eyebrow({
    children,
    className = ""
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <Text className={`text-[13px] font-semibold text-ink-3 ${className}`}>
            {children}
        </Text>
    )
}

/** Large tracking-tight headline. Mirrors `.display`. */
export function Display({
    children,
    className = "",
    size = 34
}: {
    children: ReactNode
    className?: string
    size?: number
}) {
    return (
        <Text
            style={{
                fontSize: size,
                lineHeight: size * 1.05,
                letterSpacing: size * -0.035
            }}
            className={`font-bold text-ink ${className}`}
        >
            {children}
        </Text>
    )
}

/** Monospace text with tabular figures — for counters and codes. */
export function Mono({
    children,
    className = "",
    style
}: {
    children: ReactNode
    className?: string
    style?: TextInputProps["style"]
}) {
    return (
        <Text
            style={[{ fontFamily: MONO, fontVariant: ["tabular-nums"] }, style]}
            className={className}
        >
            {children}
        </Text>
    )
}

export function Divider({ className = "" }: { className?: string }) {
    return <View className={`h-px bg-line-2 ${className}`} />
}

/** Dashed, greyed-out card that sits at the end of a list to add another item. */
export function AddCard({
    label,
    onPress
}: {
    label: string
    onPress: () => void
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            className="flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-bg-sunken/50 p-5 active:opacity-60"
        >
            <Text className="text-[18px] font-medium text-ink-3">+</Text>
            <Text className="text-[15px] font-medium text-ink-3">{label}</Text>
        </Pressable>
    )
}

/* ----------------------------------------------------------------- buttons */

type ButtonVariant = "primary" | "accent" | "line" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

const BUTTON_BG: Record<ButtonVariant, string> = {
    primary: "bg-ink",
    accent: "bg-lime",
    line: "border border-line bg-transparent",
    ghost: "bg-transparent",
    danger: "bg-coral"
}

const BUTTON_FG: Record<ButtonVariant, string> = {
    primary: "text-bg",
    accent: "text-ink",
    line: "text-ink",
    ghost: "text-ink",
    danger: "text-white"
}

const BUTTON_PAD: Record<ButtonSize, string> = {
    sm: "px-3.5 py-2.5",
    md: "px-5 py-3.5",
    lg: "px-6 py-[17px]"
}

const BUTTON_TEXT: Record<ButtonSize, string> = {
    sm: "text-[14px]",
    md: "text-[16px]",
    lg: "text-[17px] font-semibold"
}

/** Pill button. Mirrors `.btn` and its variant/size modifiers. */
export function Button({
    label,
    onPress,
    variant = "primary",
    size = "md",
    disabled = false,
    busy = false,
    className = ""
}: {
    label: string
    onPress?: () => void
    variant?: ButtonVariant
    size?: ButtonSize
    disabled?: boolean
    /** Shows a spinner in place of the label's leading edge. */
    busy?: boolean
    className?: string
}) {
    const inactive = disabled || busy
    return (
        <Pressable
            onPress={onPress}
            disabled={inactive}
            accessibilityRole="button"
            className={`flex-row items-center justify-center gap-2 rounded-full ${
                BUTTON_BG[variant]
            } ${BUTTON_PAD[size]} ${inactive ? "opacity-60" : ""} ${className}`}
        >
            {busy && (
                <ActivityIndicator
                    size="small"
                    color={
                        variant === "primary" || variant === "danger"
                            ? colors.bg
                            : colors.ink
                    }
                />
            )}
            <Text
                className={`font-medium ${BUTTON_FG[variant]} ${BUTTON_TEXT[size]}`}
            >
                {label}
            </Text>
        </Pressable>
    )
}

/** Square icon-only button — the sidebar's `MiniButton` and the row refreshers. */
export function IconButton({
    glyph,
    onPress,
    disabled = false,
    busy = false,
    label,
    size = 32
}: {
    glyph: string
    onPress?: () => void
    disabled?: boolean
    busy?: boolean
    /** Accessibility label; the glyph alone doesn't describe the action. */
    label: string
    size?: number
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || busy}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={{ width: size, height: size }}
            className={`items-center justify-center rounded-[9px] border border-line bg-bg-card ${
                disabled || busy ? "opacity-50" : ""
            }`}
        >
            {busy ? (
                <ActivityIndicator size="small" color={colors.ink3} />
            ) : (
                <Text className="text-[14px] text-ink-3">{glyph}</Text>
            )}
        </Pressable>
    )
}

/** Bordered option button used by the dialog pickers (source, cadence, type). */
export function ChoiceButton({
    selected,
    onPress,
    children,
    className = ""
}: {
    selected: boolean
    onPress: () => void
    children: ReactNode
    className?: string
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`rounded-[14px] border-[1.5px] px-4 py-3.5 ${
                selected ? "border-ink bg-bg-sunken" : "border-line bg-bg-card"
            } ${className}`}
        >
            {children}
        </Pressable>
    )
}

/* ------------------------------------------------------------------- forms */

export function Label({ children }: { children: ReactNode }) {
    return (
        <Text className="mb-2 text-[15px] font-semibold text-ink-2">
            {children}
        </Text>
    )
}

/**
 * Single-line text field. Sized with an explicit height and no line height:
 * iOS clips a TextInput's text when a line height is set, which the text-*
 * classes would otherwise add.
 */
export function Input({
    className = "",
    style,
    ...rest
}: TextInputProps & { className?: string }) {
    return (
        <TextInput
            placeholderTextColor={colors.ink3}
            style={[{ fontSize: 17, height: 52, paddingHorizontal: 16 }, style]}
            className={`rounded-[14px] border border-line bg-bg-card text-ink ${className}`}
            {...rest}
        />
    )
}

/** Coral error panel. Mirrors the `role="alert"` lists on the web forms. */
export function ErrorList({ errors }: { errors: string[] }) {
    if (errors.length === 0) return null
    return (
        <View
            accessibilityRole="alert"
            className="gap-1 rounded-[12px] bg-coral-soft p-3.5"
        >
            {errors.map((msg, i) => (
                <Text key={i} className="text-[14px] text-coral-ink">
                    {msg}
                </Text>
            ))}
        </View>
    )
}

/* ------------------------------------------------------------------- chips */

export function Chip({
    children,
    className = ""
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <View
            className={`flex-row items-center gap-1.5 rounded-full bg-bg-sunken px-2.5 py-1 ${className}`}
        >
            {children}
        </View>
    )
}

/** Small round color marker — the web's `.dot-lime` / `.dot-coral` / `.dot-ink`. */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color
            }}
        />
    )
}

/* ------------------------------------------------------------------ chrome */

export function Spinner({ size = 14 }: { size?: number }) {
    return (
        <ActivityIndicator
            size={size > 20 ? "large" : "small"}
            color={colors.ink3}
        />
    )
}

/** Wordmark lockup — a lime dot + "Accountable". */
export function AccLogo({ size = 18 }: { size?: number }) {
    const dot = size * 0.78
    return (
        <View className="flex-row items-center gap-2">
            <View
                style={{
                    width: dot,
                    height: dot,
                    borderRadius: dot / 2,
                    backgroundColor: colors.lime,
                    borderWidth: 1,
                    borderColor: colors.ink,
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <View
                    style={{
                        width: dot * 0.42,
                        height: dot * 0.42,
                        borderRadius: dot,
                        backgroundColor: colors.ink
                    }}
                />
            </View>
            <Text
                style={{ fontSize: size, letterSpacing: size * -0.02 }}
                className="font-bold text-ink"
            >
                Beacc
            </Text>
        </View>
    )
}

/* -------------------------------------------------------- integration marks */

function GitHubIcon({ size = 22 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                fill={colors.ink}
                d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.77.11 3.06.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16v3.2c0 .31.21.68.8.56 4.57-1.53 7.85-5.84 7.85-10.92C23.5 5.65 18.35.5 12 .5z"
            />
        </Svg>
    )
}

function LeetCodeIcon({ size = 22 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Polyline
                points="9 6 4 12 9 18"
                fill="none"
                stroke={colors.ink}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Polyline
                points="15 6 20 12 15 18"
                fill="none"
                stroke={colors.ink}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Line
                x1={14}
                y1={4}
                x2={10}
                y2={20}
                stroke={colors.ink}
                strokeWidth={2}
                strokeLinecap="round"
            />
        </Svg>
    )
}

function WorkoutIcon({ size = 24 }: { size?: number }) {
    const props = {
        stroke: colors.ink,
        strokeWidth: 2,
        strokeLinecap: "round" as const,
        fill: "none"
    }
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M6 4v16" {...props} />
            <Path d="M18 4v16" {...props} />
            <Path d="M3 8v8" {...props} />
            <Path d="M21 8v8" {...props} />
            <Path d="M6 12h12" {...props} />
        </Svg>
    )
}

function SleepIcon({ size = 24 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
                stroke={colors.ink}
                strokeWidth={2}
                strokeLinejoin="round"
                fill="none"
            />
        </Svg>
    )
}

function StepsIcon({ size = 24 }: { size?: number }) {
    const props = {
        stroke: colors.ink,
        strokeWidth: 2,
        strokeLinejoin: "round" as const,
        fill: "none"
    }
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                d="M7 3c1.7 0 2.5 1.8 2.5 4.5S8.8 13 7 13s-2.5-2.8-2.5-5.5S5.3 3 7 3Z"
                {...props}
            />
            <Path d="M5 16.5h4V19a2 2 0 0 1-4 0v-2.5Z" {...props} />
            <Path
                d="M17 7c1.7 0 2.5 1.8 2.5 4.5S18.8 17 17 17s-2.5-2.8-2.5-5.5S15.3 7 17 7Z"
                {...props}
            />
            <Path d="M15 20h4v.5a2 2 0 0 1-4 0V20Z" {...props} />
        </Svg>
    )
}

/** Brand mark for a known integration, or null so the caller falls back to a glyph. */
export function IntegrationIcon({
    name,
    size
}: {
    name: string
    size?: number
}): ReactNode {
    switch (name) {
        case "github":
            return <GitHubIcon size={size} />
        case "leetcode":
            return <LeetCodeIcon size={size} />
        case "apple_fitness":
            return <WorkoutIcon size={size} />
        case "apple_sleep":
            return <SleepIcon size={size} />
        case "apple_steps":
            return <StepsIcon size={size} />
        default:
            return null
    }
}

const TILE_BG: Record<Exclude<TileVariant, "">, string> = {
    ink: colors.ink,
    lime: colors.limeSoft,
    coral: colors.coralSoft
}

const TILE_FG: Record<Exclude<TileVariant, "">, string> = {
    ink: colors.bg,
    lime: colors.limeInk,
    coral: colors.coralInk
}

/**
 * Rounded badge standing in for a source's brand mark. An [icon] renders on the
 * neutral surface (the shape carries the meaning); otherwise [variant] tints a
 * text glyph, matching the web's `.source-tile`.
 */
export function SourceTile({
    label,
    variant = "",
    icon,
    size = "md"
}: {
    label: string
    variant?: TileVariant
    icon?: ReactNode
    /** "sm" renders the compact 30px tile. */
    size?: "sm" | "md"
}) {
    const px = size === "sm" ? 30 : 44
    const tinted = variant !== "" && !icon
    return (
        <View
            style={{
                width: px,
                height: px,
                borderRadius: size === "sm" ? 9 : 12,
                backgroundColor: tinted ? TILE_BG[variant] : colors.bgSunken
            }}
            className="items-center justify-center"
        >
            {icon ?? (
                <Text
                    style={{
                        fontFamily: MONO,
                        fontSize: size === "sm" ? 11 : 14,
                        color: tinted ? TILE_FG[variant] : colors.ink
                    }}
                    className="font-semibold"
                >
                    {label}
                </Text>
            )}
        </View>
    )
}

/* -------------------------------------------------------------------- bars */

/** Rounded progress track. Mirrors `.bar`. */
export function Bar({
    pct,
    color = colors.lime,
    height = 8,
    track,
    children
}: {
    /** Fill width, 0–100. */
    pct: number
    color?: string
    height?: number
    track?: string
    /** Overlay drawn on top of the fill, e.g. a pace marker. */
    children?: ReactNode
}) {
    return (
        // No flex here: these bars sit in column layouts, where `flex-1` would set
        // flexBasis:0 and fight the explicit height. Stretching fills the width.
        <View
            style={{
                height,
                borderRadius: height,
                backgroundColor: track ?? colors.bgSunken,
                overflow: "hidden",
                alignSelf: "stretch"
            }}
        >
            <View
                style={{
                    width: `${Math.min(100, Math.max(0, pct))}%`,
                    height: "100%",
                    borderRadius: height,
                    backgroundColor: color
                }}
            />
            {children}
        </View>
    )
}

/** Circular progress ring with a centred percentage. Mirrors RingChart on web. */
export function RingChart({
    pct,
    label,
    tone = "lime",
    size = 120
}: {
    pct: number
    label: string
    tone?: Tone
    size?: number
}) {
    const stroke = 14
    const r = size / 2 - stroke / 2 - 1
    const c = 2 * Math.PI * r
    const color =
        tone === "coral"
            ? colors.coral
            : tone === "ink"
              ? colors.ink
              : colors.lime

    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={colors.line2}
                    strokeWidth={stroke}
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${(Math.min(100, pct) / 100) * c} ${c}`}
                    // Start the sweep at 12 o'clock instead of 3 o'clock.
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <View className="absolute inset-0 items-center justify-center">
                <View className="flex-row items-baseline">
                    <Mono className="text-[28px] font-bold text-ink">
                        {pct}
                    </Mono>
                    <Text className="text-sm text-ink-3">%</Text>
                </View>
                <Text className="mt-1 text-[11px] text-ink-3">{label}</Text>
            </View>
        </View>
    )
}
