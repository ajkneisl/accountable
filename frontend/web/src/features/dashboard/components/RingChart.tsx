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
        <div className="relative h-[140px] w-[140px]">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="mono text-3xl font-bold leading-none tracking-[-0.03em]">
                    {pct}
                    <span className="text-sm text-ink-3">%</span>
                </div>
                <div className="mt-1 text-[11px] text-ink-3">{label}</div>
            </div>
        </div>
    )
}
