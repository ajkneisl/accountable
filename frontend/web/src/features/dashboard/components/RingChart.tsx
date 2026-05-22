// Circular progress ring with a centred percentage.

export function RingChart({
    pct,
    label,
    tone = "lime"
}: {
    pct: number
    label: string
    tone?: "lime" | "coral" | "ink"
}) {
    const R = 56
    const C = 2 * Math.PI * R
    const stroke =
        tone === "lime"
            ? "var(--lime)"
            : tone === "coral"
              ? "var(--coral)"
              : "var(--ink)"
    return (
        <div style={{ position: "relative", width: 140, height: 140 }}>
            <svg width="140" height="140">
                <circle
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke="var(--line-2)"
                    strokeWidth="14"
                />
                <circle
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * C} ${C}`}
                    transform="rotate(-90 70 70)"
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <div
                    className="mono"
                    style={{
                        fontSize: 30,
                        fontWeight: 700,
                        letterSpacing: "-0.03em",
                        lineHeight: 1
                    }}
                >
                    {pct}
                    <span style={{ fontSize: 14, color: "var(--ink-3)" }}>
                        %
                    </span>
                </div>
                <div
                    style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        marginTop: 4
                    }}
                >
                    {label}
                </div>
            </div>
        </div>
    )
}
