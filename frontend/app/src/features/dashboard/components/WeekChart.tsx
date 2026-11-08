// Seven-day column chart with a target reference line. With [onSelect], each
// day's column is tappable: the picked day is highlighted and the rest dim.

import { Pressable, View } from "react-native"
import { useColors } from "../../../theme"
import { Mono } from "../../../ui/primitives"

// vals is a fixed Monday–Sunday week (Monday first), so labels are static.
const WEEKDAY = ["M", "T", "W", "T", "F", "S", "S"]
const WEEKDAY_NAME = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]

const CHART_HEIGHT = 80

export function WeekChart({
    vals,
    target,
    limit = false,
    color: colorProp,
    selected = null,
    onSelect,
    selectableDays = 7
}: {
    vals: number[]
    target: number
    /** The target is a ceiling: days at or under it count as hit. */
    limit?: boolean
    /** Fill for days that hit the target. */
    color?: string
    /** The highlighted day (0 = Monday), or null for none. */
    selected?: number | null
    /** Called with a tapped day, or null when the selected day is tapped again. */
    onSelect?: (day: number | null) => void
    /** Days from Monday that can be picked; later ones (still to come) can't. */
    selectableDays?: number
}) {
    const colors = useColors()
    const color = colorProp ?? colors.ink
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
                {vals.map((v, i) => {
                    const picked = selected === i
                    const dimmed = selected !== null && !picked
                    return (
                        // The whole column is the tap target, not just the bar,
                        // so short and empty days are as easy to pick.
                        <Pressable
                            key={i}
                            disabled={!onSelect || i >= selectableDays}
                            onPress={() => onSelect?.(picked ? null : i)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: picked }}
                            accessibilityLabel={WEEKDAY_NAME[i]}
                            style={{
                                height: CHART_HEIGHT,
                                justifyContent: "flex-end",
                                borderRadius: 5,
                                backgroundColor: picked
                                    ? colors.bgSunken
                                    : "transparent"
                            }}
                            className="flex-1"
                        >
                            <View
                                style={{
                                    height: Math.max(
                                        (v / max) * CHART_HEIGHT,
                                        v === 0 ? 0 : 4
                                    ),
                                    backgroundColor: (
                                        limit ? v <= target : v >= target
                                    )
                                        ? color
                                        : colors.line,
                                    borderRadius: 3,
                                    opacity: dimmed ? 0.35 : 1,
                                    borderWidth: picked ? 1.5 : 0,
                                    borderColor: colors.ink
                                }}
                            />
                        </Pressable>
                    )
                })}
            </View>
            <View className="mt-1.5 flex-row gap-1.5">
                {WEEKDAY.map((d, i) => (
                    <Mono
                        key={i}
                        className={`flex-1 text-center text-[10px] ${
                            selected === i ? "font-bold text-ink" : "text-ink-3"
                        }`}
                    >
                        {d}
                    </Mono>
                ))}
            </View>
        </View>
    )
}
