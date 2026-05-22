// A labelled headline statistic.

export function Stat({
    label,
    value,
    sub,
    tone
}: {
    label: string
    value: string
    sub: string
    tone?: "lime" | "coral"
}) {
    return (
        <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
                {label}
            </div>
            <div
                className="mono tab"
                style={{
                    fontSize: 44,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    color:
                        tone === "lime"
                            ? "var(--lime-ink)"
                            : tone === "coral"
                              ? "var(--coral-ink)"
                              : "var(--ink)"
                }}
            >
                {value}
            </div>
            <div
                style={{
                    fontSize: 12,
                    color: "var(--ink-3)",
                    marginTop: 6
                }}
            >
                {sub}
            </div>
        </div>
    )
}
