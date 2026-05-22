// Landing footer.

import { AccLogo } from "../../common/primitives"

export function Footer() {
    return (
        <footer
            style={{
                padding: "40px 64px 56px",
                borderTop: "1px solid var(--line-2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                color: "var(--ink-3)",
                fontSize: 13
            }}
        >
            <div>
                <AccLogo />
                <div style={{ marginTop: 12 }}>
                    © 2026 · Built by two friends who kept missing the gym.
                </div>
            </div>
            <div style={{ display: "flex", gap: 40 }}>
                <div>
                    <div className="eyebrow" style={{ marginBottom: 10 }}>
                        Product
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6
                        }}
                    >
                        {["Sources", "Competitions", "Squads"].map((l) => (
                            <a
                                key={l}
                                style={{
                                    color: "inherit",
                                    textDecoration: "none",
                                    cursor: "pointer"
                                }}
                            >
                                {l}
                            </a>
                        ))}
                    </div>
                </div>
                <div>
                    <div className="eyebrow" style={{ marginBottom: 10 }}>
                        Company
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6
                        }}
                    >
                        {["About", "Manifesto", "Privacy"].map((l) => (
                            <a
                                key={l}
                                style={{
                                    color: "inherit",
                                    textDecoration: "none",
                                    cursor: "pointer"
                                }}
                            >
                                {l}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}
