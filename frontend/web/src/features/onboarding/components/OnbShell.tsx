// Shared layout for onboarding steps 1–4: header + progress, split body, footer.

import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { AccLogo } from "../../common/primitives"
import { TOTAL } from "../constants"

export function OnbShell({
    step,
    title,
    kicker,
    children,
    footer,
    side,
    onBack
}: {
    step: number
    title: ReactNode
    kicker?: string
    children: ReactNode
    footer: ReactNode
    side: ReactNode
    onBack?: () => void
}) {
    return (
        <div
            className="acc"
            style={{
                width: 1440,
                margin: "0 auto",
                minHeight: 900,
                display: "flex",
                flexDirection: "column",
                background: "var(--bg)"
            }}
        >
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "24px 36px"
                }}
            >
                <AccLogo />
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14
                    }}
                >
                    <span
                        className="mono"
                        style={{
                            fontSize: 11,
                            color: "var(--ink-3)",
                            letterSpacing: "0.1em"
                        }}
                    >
                        STEP {String(step).padStart(2, "0")} /{" "}
                        {String(TOTAL).padStart(2, "0")}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                        {Array.from({ length: TOTAL }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: 24,
                                    height: 4,
                                    borderRadius: 2,
                                    background:
                                        i < step
                                            ? "var(--ink)"
                                            : "var(--line)"
                                }}
                            />
                        ))}
                    </div>
                    <Link
                        to="/"
                        style={{
                            fontSize: 13,
                            color: "var(--ink-3)",
                            textDecoration: "none",
                            marginLeft: 8
                        }}
                    >
                        Save &amp; quit
                    </Link>
                </div>
            </header>

            <div
                style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    padding: "20px 0 0",
                    alignItems: "stretch"
                }}
            >
                <div
                    style={{
                        padding: "40px 36px 40px 88px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                    }}
                >
                    {kicker && (
                        <div
                            className="eyebrow"
                            style={{ marginBottom: 14 }}
                        >
                            {kicker}
                        </div>
                    )}
                    <h1
                        className="display"
                        style={{
                            fontSize: 56,
                            margin: "0 0 20px",
                            maxWidth: 560
                        }}
                    >
                        {title}
                    </h1>
                    {children}
                </div>
                <div
                    style={{
                        padding: "40px 88px 40px 36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {side}
                </div>
            </div>

            <footer
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 36px 36px"
                }}
            >
                {onBack ? (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={onBack}
                    >
                        ← Back
                    </button>
                ) : (
                    <div />
                )}
                {footer}
            </footer>
        </div>
    )
}
