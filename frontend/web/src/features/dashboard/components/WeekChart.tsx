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
            <div
                style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 6,
                    height: 80
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: (target / max) * 80,
                        height: 0,
                        borderTop: "1px dashed var(--ink-3)",
                        opacity: 0.5
                    }}
                />
                {vals.map((v, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4
                        }}
                    >
                        <div
                            style={{
                                width: "100%",
                                height: (v / max) * 80,
                                minHeight: v === 0 ? 0 : 4,
                                background:
                                    v >= target ? color : "var(--line)",
                                borderRadius: 3,
                                transition: "height .3s"
                            }}
                        />
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {days.map((d, i) => (
                    <div
                        key={i}
                        className="mono"
                        style={{
                            flex: 1,
                            textAlign: "center",
                            fontSize: 10,
                            color: "var(--ink-3)"
                        }}
                    >
                        {d}
                    </div>
                ))}
            </div>
        </div>
    )
}
