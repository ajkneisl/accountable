// Cumulative daily-score line chart — you vs Marcus across the week.

export function DailyScoreChart({
    you,
    marcus
}: {
    you: number[]
    marcus: number[]
}) {
    const W = 720
    const H = 200
    const P = 28
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const max = Math.max(...you, ...marcus, 5) + 2
    const xs = (i: number) => P + (i / (days.length - 1)) * (W - P * 2)
    const ys = (v: number) => H - P - (v / max) * (H - P * 2)
    const path = (vals: number[]) =>
        vals
            .map(
                (v, i) =>
                    (i ? "L" : "M") + xs(i).toFixed(1) + " " + ys(v).toFixed(1)
            )
            .join(" ")
    const today = 2 // wed

    return (
        <div className="relative">
            <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                height={H}
                className="block overflow-visible"
            >
                {[0, max / 2, max].map((v, i) => (
                    <g key={i}>
                        <line
                            x1={P}
                            y1={ys(v)}
                            x2={W - P}
                            y2={ys(v)}
                            stroke="var(--line-2)"
                        />
                        <text
                            x={W - P + 6}
                            y={ys(v) + 4}
                            fontSize="10"
                            fill="var(--ink-3)"
                            fontFamily="Geist Mono"
                        >
                            {Math.round(v)}
                        </text>
                    </g>
                ))}

                <line
                    x1={xs(today)}
                    y1={P / 2}
                    x2={xs(today)}
                    y2={H - P}
                    stroke="var(--ink)"
                    strokeDasharray="3 4"
                    opacity="0.3"
                />

                <path
                    d={
                        path(marcus) +
                        ` L${xs(days.length - 1)} ${ys(0)} L${xs(0)} ${ys(0)} Z`
                    }
                    fill="var(--coral)"
                    opacity="0.08"
                />
                <path
                    d={
                        path(you) +
                        ` L${xs(days.length - 1)} ${ys(0)} L${xs(0)} ${ys(0)} Z`
                    }
                    fill="var(--lime)"
                    opacity="0.16"
                />

                <path
                    d={path(marcus)}
                    stroke="var(--coral)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d={path(you)}
                    stroke="var(--lime-ink)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {you.map((v, i) =>
                    i <= today ? (
                        <circle
                            key={"y" + i}
                            cx={xs(i)}
                            cy={ys(v)}
                            r={i === today ? 6 : 4}
                            fill="var(--lime)"
                            stroke="var(--bg)"
                            strokeWidth="2"
                        />
                    ) : null
                )}
                {marcus.map((v, i) =>
                    i <= today ? (
                        <circle
                            key={"m" + i}
                            cx={xs(i)}
                            cy={ys(v)}
                            r={i === today ? 6 : 4}
                            fill="var(--coral)"
                            stroke="var(--bg)"
                            strokeWidth="2"
                        />
                    ) : null
                )}

                {days.map((d, i) => (
                    <text
                        key={d}
                        x={xs(i)}
                        y={H - 6}
                        fontSize="10"
                        fill={i === today ? "var(--ink)" : "var(--ink-3)"}
                        textAnchor="middle"
                        fontFamily="Geist Mono"
                        fontWeight={i === today ? 600 : 400}
                    >
                        {d}
                    </text>
                ))}

                <g transform={`translate(${xs(today)}, ${P / 2})`}>
                    <rect
                        x="-22"
                        y="-14"
                        width="44"
                        height="18"
                        rx="9"
                        fill="var(--ink)"
                    />
                    <text
                        x="0"
                        y="-1"
                        textAnchor="middle"
                        fontSize="10"
                        fill="var(--bg)"
                        fontFamily="Geist Mono"
                        fontWeight="600"
                    >
                        TODAY
                    </text>
                </g>
            </svg>
        </div>
    )
}
