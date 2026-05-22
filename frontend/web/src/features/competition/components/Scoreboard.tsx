// The dark scoreboard card — both fighters, the lead, and the stakes strip.

import { STAKES } from "../data"
import { CompFighter } from "./CompFighter"

export function Scoreboard() {
    return (
        <div
            className="card"
            style={{
                background: "var(--ink)",
                color: "var(--bg)",
                border: "none",
                padding: "36px 40px",
                marginBottom: 18,
                position: "relative",
                overflow: "hidden"
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
                    backgroundSize: "100% 32px",
                    pointerEvents: "none"
                }}
            />

            <div
                style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 40
                }}
            >
                <CompFighter
                    side="left"
                    name="Lukas"
                    glyph="L"
                    color="var(--lime)"
                    dark={false}
                    score={14}
                    streak="6d"
                    vals="4.7"
                    big
                    won
                    marker="@lukas-k"
                />
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            opacity: 0.5,
                            fontFamily: "Geist Mono",
                            letterSpacing: "0.1em"
                        }}
                    >
                        VS
                    </div>
                    <div
                        className="mono"
                        style={{
                            fontSize: 38,
                            fontWeight: 700,
                            color: "var(--lime)",
                            letterSpacing: "-0.04em",
                            lineHeight: 1
                        }}
                    >
                        +3
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                        your lead
                    </div>
                </div>
                <CompFighter
                    side="right"
                    name="Marcus"
                    glyph="M"
                    color="var(--coral)"
                    dark
                    score={11}
                    streak="14d"
                    vals="3.7"
                    marker="@marcusf"
                />
            </div>

            <div
                style={{
                    position: "relative",
                    marginTop: 32,
                    paddingTop: 22,
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 24
                }}
            >
                {STAKES.map((x, i) => (
                    <div key={i}>
                        <div
                            style={{
                                fontSize: 10,
                                color: "var(--lime)",
                                fontFamily: "Geist Mono",
                                letterSpacing: "0.1em",
                                marginBottom: 6
                            }}
                        >
                            {x.l}
                        </div>
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                marginBottom: 2
                            }}
                        >
                            {x.v}
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                opacity: 0.5
                            }}
                        >
                            {x.sub}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
