// Cycles the billboard's theme: light, dark, then auto, which follows the time
// of day. The label names the current choice.

import {
    AUTO_LIGHT_FROM,
    AUTO_LIGHT_UNTIL,
    type BillboardTheme,
    THEME_MODES,
    type ThemeMode
} from "../hooks"

const LABEL: Record<ThemeMode, string> = {
    light: "Light",
    dark: "Dark",
    auto: "Auto"
}

/** "7 PM" style hour, in the browser's own format. */
function hourLabel(hour: number): string {
    return new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, {
        hour: "numeric"
    })
}

export function ThemeButton({ theme }: { theme: BillboardTheme }) {
    const next =
        THEME_MODES[(THEME_MODES.indexOf(theme.mode) + 1) % THEME_MODES.length]
    return (
        <button
            type="button"
            onClick={() => theme.setMode(next)}
            title={`Auto is dark from ${hourLabel(AUTO_LIGHT_UNTIL)} to ${hourLabel(AUTO_LIGHT_FROM)}. Click for ${LABEL[next].toLowerCase()}.`}
            className="btn btn-line btn-sm"
        >
            Theme: {LABEL[theme.mode]}
        </button>
    )
}
