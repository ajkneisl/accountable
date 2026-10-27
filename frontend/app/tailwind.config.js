/** @type {import('tailwindcss').Config} */

// Design tokens. Each reads a CSS variable that the root layout sets from the
// light or dark palette in src/theme.ts (see `themeVars`), so every color class
// follows the appearance picked in Settings.
const TOKENS = [
    "bg",
    "bg-card",
    "bg-sunken",
    "ink",
    "ink-2",
    "ink-3",
    "line",
    "line-2",
    "lime",
    "lime-ink",
    "lime-soft",
    "coral",
    "coral-soft",
    "coral-ink",
    "indigo"
]

const colors = Object.fromEntries(
    TOKENS.map((t) => [t, `rgb(var(--${t}) / <alpha-value>)`])
)
// Text on a bright fill (lime, coral) stays dark in both appearances.
colors["on-fill"] = "#16100c"

module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "../shared/src/**/*.{js,jsx,ts,tsx}"
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors,
            borderRadius: {
                sm: "6px",
                DEFAULT: "10px",
                lg: "16px",
                xl: "24px"
            }
        }
    },
    plugins: []
}
