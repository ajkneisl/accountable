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
    const toneClass =
        tone === "lime"
            ? "text-lime-ink"
            : tone === "coral"
              ? "text-coral-ink"
              : "text-ink"
    return (
        <div>
            <div className="eyebrow mb-2">{label}</div>
            <div
                className={`mono tab text-[44px] font-bold leading-none tracking-[-0.03em] ${toneClass}`}
            >
                {value}
            </div>
            <div className="mt-1.5 text-xs text-ink-3">{sub}</div>
        </div>
    )
}
