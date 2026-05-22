// One competitor's avatar, name, and big score in the scoreboard.

export function CompFighter({
    side,
    name,
    glyph,
    color,
    dark,
    score,
    streak,
    big,
    vals,
    won,
    marker
}: {
    side: "left" | "right"
    name: string
    glyph: string
    color: string
    dark?: boolean
    score: number
    streak: string
    big?: boolean
    vals: string
    won?: boolean
    marker: string
}) {
    return (
        <div
            style={{
                flex: 1,
                textAlign: side === "left" ? "left" : "right",
                display: "flex",
                flexDirection: "column",
                gap: 10
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexDirection: side === "left" ? "row" : "row-reverse"
                }}
            >
                <div style={{ position: "relative" }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: "50%",
                            background: color,
                            color: dark ? "#fff" : "var(--ink)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 26,
                            fontWeight: 700
                        }}
                    >
                        {glyph}
                    </div>
                    {won && (
                        <div
                            style={{
                                position: "absolute",
                                top: -6,
                                right: -6,
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: "var(--lime)",
                                color: "var(--ink)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 12,
                                fontWeight: 700
                            }}
                        >
                            ★
                        </div>
                    )}
                </div>
                <div
                    style={{
                        textAlign: side === "left" ? "left" : "right"
                    }}
                >
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            letterSpacing: "-0.02em"
                        }}
                    >
                        {name}
                    </div>
                    <div
                        className="mono"
                        style={{ fontSize: 12, color: "var(--ink-3)" }}
                    >
                        {marker}
                    </div>
                </div>
            </div>
            <div
                className="mono tab"
                style={{
                    fontSize: 96,
                    fontWeight: 700,
                    letterSpacing: "-0.05em",
                    lineHeight: 0.9,
                    color: big ? "var(--ink)" : "var(--ink-3)"
                }}
            >
                {score}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                streak {streak} · {vals} pts/day avg
            </div>
        </div>
    )
}
