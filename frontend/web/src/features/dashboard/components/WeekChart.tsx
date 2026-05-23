// Seven-day column chart with a dashed target line.

import type { TileVariant } from "../../common/primitives"

export function WeekChart({
    vals,
    target,
    tone = "ink"
}: {
    vals: number[]
    target: number
    tone?: TileVariant
}) {
    const days = ["M", "T", "W", "T", "F", "S", "S"]
    const max = Math.max(target, ...vals) * 1.2
    const color =
        tone === "lime"
            ? "var(--lime)"
            : tone === "coral"
              ? "var(--coral)"
              : "var(--ink)"
    return (
        <div>
            <div className="relative flex h-20 items-end gap-1.5">
                <div
                    className="absolute left-0 right-0 h-0 border-t border-dashed border-ink-3 opacity-50"
                    style={{ bottom: (target / max) * 80 }}
                />
                {vals.map((v, i) => (
                    <div
                        key={i}
                        className="flex flex-1 flex-col items-center gap-1"
                    >
                        <div
                            className="w-full rounded-[3px] transition-[height] duration-300"
                            style={{
                                height: (v / max) * 80,
                                minHeight: v === 0 ? 0 : 4,
                                background:
                                    v >= target ? color : "var(--line)"
                            }}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-1.5 flex gap-1.5">
                {days.map((d, i) => (
                    <div
                        key={i}
                        className="mono flex-1 text-center text-[10px] text-ink-3"
                    >
                        {d}
                    </div>
                ))}
            </div>
        </div>
    )
}
