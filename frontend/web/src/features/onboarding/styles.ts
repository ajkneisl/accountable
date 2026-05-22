// Shared form styles for onboarding step cards.

import type { CSSProperties } from "react"

export const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--ink-2)",
    marginBottom: 6
}

export const inputStyle: CSSProperties = {
    width: "100%",
    border: "1px solid var(--line)",
    borderRadius: 10,
    padding: "11px 14px",
    font: "inherit",
    fontSize: 14,
    outline: 0,
    marginBottom: 14
}
