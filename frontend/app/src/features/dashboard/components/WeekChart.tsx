// Seven-day column chart with a target reference line.

import { View } from "react-native"
import { colors } from "../../../theme"
import { Mono } from "../../../ui/primitives"

// vals is a fixed Monday–Sunday week (Monday first), so labels are static.
const WEEKDAY = ["M", "T", "W", "T", "F", "S", "S"]

const CHART_HEIGHT = 80

export function WeekChart({
    vals,
    target,
    color = colors.ink
}: {
    vals: number[]
    target: number
    /** Fill for days that hit the target. */
    color?: string
}) {
    // Headroom above the tallest bar so a maxed-out day doesn't touch the top.
    const max = Math.max(target, ...vals, 1) * 1.2

    return (
        <View>
            <View
                style={{ height: CHART_HEIGHT }}
                className="flex-row items-end gap-1.5"
            >
                {/* Target reference line — RN has no dashed borders, so this is a
                    hairline rule at the same position the web dashes. */}
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: (target / max) * CHART_HEIGHT,
                        height: 1,
                        backgroundColor: colors.ink3,
                        opacity: 0.4
                    }}
                />
                {vals.map((v, i) => (
                    <View
                        key={i}
                        style={{
                            height: Math.max(
                                (v / max) * CHART_HEIGHT,
                                v === 0 ? 0 : 4
                            ),
                            backgroundColor: v >= target ? color : colors.line,
                            borderRadius: 3
                        }}
                        className="flex-1"
                    />
                ))}
            </View>
            <View className="mt-1.5 flex-row gap-1.5">
                {WEEKDAY.map((d, i) => (
                    <Mono
                        key={i}
                        className="flex-1 text-center text-[10px] text-ink-3"
                    >
                        {d}
                    </Mono>
                ))}
            </View>
        </View>
    )
}
