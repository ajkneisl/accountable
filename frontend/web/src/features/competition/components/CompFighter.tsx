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
    const isLeft = side === "left"
    return (
        <div
            className={`flex flex-1 flex-col gap-2.5 ${isLeft ? "text-left" : "text-right"}`}
        >
            <div
                className={`flex items-center gap-3.5 ${isLeft ? "flex-row" : "flex-row-reverse"}`}
            >
                <div className="relative">
                    <div
                        className="grid h-16 w-16 place-items-center rounded-full text-[26px] font-bold"
                        style={{
                            background: color,
                            color: dark ? "#fff" : "var(--ink)"
                        }}
                    >
                        {glyph}
                    </div>
                    {won && (
                        <div className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-lime text-xs font-bold text-ink">
                            ★
                        </div>
                    )}
                </div>
                <div className={isLeft ? "text-left" : "text-right"}>
                    <div className="text-[22px] font-bold tracking-[-0.02em]">
                        {name}
                    </div>
                    <div className="mono text-xs text-ink-3">{marker}</div>
                </div>
            </div>
            <div
                className={`mono tab text-[96px] font-bold leading-[0.9] tracking-[-0.05em] ${big ? "text-ink" : "text-ink-3"}`}
            >
                {score}
            </div>
            <div className="text-[13px] text-ink-3">
                streak {streak} · {vals} pts/day avg
            </div>
        </div>
    )
}
