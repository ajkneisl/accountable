/** @type {import('tailwindcss').Config} */

// Design tokens mirrored from web/src/features/common/theme.css. The web sheet
// defines them in oklch(), which React Native's color parser doesn't accept, so
// they're pre-converted to their sRGB hex equivalents here.
const colors = {
    bg: "#f8f5ef",
    "bg-card": "#ffffff",
    "bg-sunken": "#efeae2",
    ink: "#16100c",
    "ink-2": "#423c37",
    "ink-3": "#7b736c",
    line: "#ddd6cf",
    "line-2": "#e9e4de",

    lime: "#a2eb3c",
    "lime-ink": "#243b00",
    "lime-soft": "#d5f9b2",

    coral: "#fd6a3a",
    "coral-soft": "#ffe5dc",
    "coral-ink": "#7f2400",

    indigo: "#2e40a3"
}

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
