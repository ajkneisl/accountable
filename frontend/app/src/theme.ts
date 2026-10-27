// Design tokens, for the places NativeWind classes can't reach: SVG stroke/fill
// props, inline style colors, and navigator options. NativeWind classes read the
// same palettes through CSS variables the root layout sets (see `themeVars`).
//
// The light palette mirrors web/src/features/common/theme.css. That sheet
// expresses it in oklch(), which React Native can't parse, so these are the sRGB
// equivalents (the two out-of-gamut greens, `lime` and `limeSoft`, are
// chroma-clipped to sRGB). The dark palette matches the home screen widgets.

import { useEffect, useState } from "react"
import { Appearance, useColorScheme } from "react-native"
import * as SecureStore from "expo-secure-store"
import { vars } from "nativewind"

const light = {
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
}

export type Palette = typeof light

const dark: Palette = {
    bg: "#16100c",
    bgCard: "#211a15",
    bgSunken: "#2b2520",
    ink: "#f8f5ef",
    ink2: "#d3cbc3",
    ink3: "#958c84",
    line: "#3d3530",
    line2: "#2f2924",

    lime: "#a2eb3c",
    limeInk: "#c9f592",
    limeSoft: "#2c3b14",

    coral: "#fd6a3a",
    coralSoft: "#3f2015",
    coralInk: "#ffb49a",

    // The light indigo all but vanishes on the dark background.
    indigo: "#8e9cf0"
}

export type Scheme = "light" | "dark"

export const palettes: Record<Scheme, Palette> = { light, dark }

/**
 * Text on a colored fill (a check mark, a rank number) stays the same in both
 * schemes: the fills don't change, so neither can what reads on them.
 */
export const onFill = { light: "#16100c", dark: "#f8f5ef" } as const

/** The scheme the app is showing: the user's choice, or the system's under System. */
export function useScheme(): Scheme {
    return useColorScheme() === "dark" ? "dark" : "light"
}

/** The palette for the scheme the app is showing; re-renders when it changes. */
export function useColors(): Palette {
    return palettes[useScheme()]
}

/** `#rrggbb` → `"r g b"`, the form Tailwind's `rgb(var(--x) / <alpha-value>)` expects. */
function channels(hex: string): string {
    const n = parseInt(hex.slice(1), 16)
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

/** Tailwind token name for each palette key, as tailwind.config.js names them. */
const TOKENS: Record<keyof Palette, string> = {
    bg: "bg",
    bgCard: "bg-card",
    bgSunken: "bg-sunken",
    ink: "ink",
    ink2: "ink-2",
    ink3: "ink-3",
    line: "line",
    line2: "line-2",
    lime: "lime",
    limeInk: "lime-ink",
    limeSoft: "lime-soft",
    coral: "coral",
    coralSoft: "coral-soft",
    coralInk: "coral-ink",
    indigo: "indigo"
}

/** CSS variables behind the NativeWind color classes, one set per scheme. */
export const themeVars: Record<Scheme, ReturnType<typeof vars>> = {
    light: vars(cssVars(light)),
    dark: vars(cssVars(dark))
}

function cssVars(p: Palette): Record<string, string> {
    const out: Record<string, string> = {}
    for (const key of Object.keys(TOKENS) as (keyof Palette)[])
        out[`--${TOKENS[key]}`] = channels(p[key])
    return out
}

// -------------------------------------------------------------- appearance

/** The appearance picked in Settings. */
export type AppearanceChoice = "system" | "light" | "dark"

const APPEARANCE_KEY = "accountable_appearance"

function apply(choice: AppearanceChoice) {
    // Overrides the app's interface style, so native pieces (switches, alerts,
    // the tab bar, sheets, Liquid Glass) follow along with ours.
    Appearance.setColorScheme(choice === "system" ? "unspecified" : choice)
}

/** Re-apply the saved appearance at launch. Before it resolves, the app follows the system. */
export async function restoreAppearance(): Promise<void> {
    try {
        const saved = await SecureStore.getItemAsync(APPEARANCE_KEY)
        if (saved === "light" || saved === "dark") apply(saved)
    } catch {
        // Unreadable: stay on the system's appearance.
    }
}

/** The saved appearance and a setter that applies and remembers a new one. */
export function useAppearance(): [
    AppearanceChoice,
    (choice: AppearanceChoice) => void
] {
    const [choice, setChoice] = useState<AppearanceChoice>("system")

    useEffect(() => {
        SecureStore.getItemAsync(APPEARANCE_KEY)
            .then((saved) => {
                if (saved === "light" || saved === "dark") setChoice(saved)
            })
            .catch(() => {})
    }, [])

    function set(next: AppearanceChoice) {
        setChoice(next)
        apply(next)
        SecureStore.setItemAsync(APPEARANCE_KEY, next).catch(() => {})
    }

    return [choice, set]
}

export const radius = {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24
} as const

/** Tint used by tiles, charts, and bars. Mirrors web's `TileVariant`. */
export type Tone = "ink" | "lime" | "coral" | ""
