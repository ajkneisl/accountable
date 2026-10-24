// Seven-day column chart with a dashed target line. Bar heights are percentages,
// so the chart takes whatever height [className] gives it.

// vals is a fixed Monday–Sunday week (Monday first), so labels are static.
const WEEKDAY = ["M", "T", "W", "T", "F", "S", "S"]

export function WeekChart({
    vals,
    target,
    color,
    className
}: {
    vals: number[]
    target: number
    color: string
    className: string
}) {
    // Headroom above the tallest bar so a maxed-out day doesn't touch the top.
    const max = Math.max(target, ...vals, 1) * 1.2

    return (
        <div className={`flex flex-col ${className}`}>
            <div className="relative flex min-h-0 flex-1 items-end gap-[0.45em]">
                <div
                    className="absolute inset-x-0 h-0 border-t border-dashed border-ink-3 opacity-50"
                    style={{ bottom: `${(target / max) * 100}%` }}
                />
                {vals.map((v, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-[0.25em] transition-[height] duration-300"
                        style={{
                            height: `${(v / max) * 100}%`,
                            minHeight: v === 0 ? 0 : 4,
                            background: v >= target ? color : "var(--line)"
                        }}
                    />
                ))}
            </div>
            <div className="mt-[0.45em] flex gap-[0.45em]">
                {WEEKDAY.map((d, i) => (
                    <div
                        key={i}
                        className="mono flex-1 text-center text-[0.75em] text-ink-3"
                    >
                        {d}
                    </div>
                ))}
            </div>
        </div>
    )
}
