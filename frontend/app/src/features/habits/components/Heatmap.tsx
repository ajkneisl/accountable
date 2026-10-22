// GitHub-style heatmap for one habit: week columns, Mon→Sun rows, sized to
// however many whole weeks fit the available width. Tapping a past day toggles it.

import { useState } from "react"
import { Pressable, View } from "react-native"
import { colors } from "../../../theme"
import { buildGrid } from "../grid"

const CELL = 13
const GAP = 3

export function Heatmap({
    start,
    today,
    done,
    fill,
    onToggle
}: {
    start: string
    today: string
    done: boolean[]
    fill: string
    onToggle: (date: string, done: boolean) => void
}) {
    const [width, setWidth] = useState(0)
    const cols = Math.max(1, Math.floor((width + GAP) / (CELL + GAP)))
    const grid = width > 0 ? buildGrid(start, today, cols) : []

    return (
        <View
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            style={{ height: 7 * CELL + 6 * GAP }}
            className="flex-row justify-end"
        >
            {grid.map((week, c) => (
                <View
                    key={week[0].date}
                    style={{ gap: GAP, marginLeft: c === 0 ? 0 : GAP }}
                >
                    {week.map((cell) => {
                        if (cell.future) {
                            return (
                                <View
                                    key={cell.date}
                                    style={{ width: CELL, height: CELL }}
                                />
                            )
                        }
                        const on = cell.index >= 0 && done[cell.index]
                        const isToday = cell.date === today
                        return (
                            <Pressable
                                key={cell.date}
                                disabled={cell.index < 0}
                                onPress={() => onToggle(cell.date, !on)}
                                hitSlop={1}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: on }}
                                accessibilityLabel={cell.date}
                                style={{
                                    width: CELL,
                                    height: CELL,
                                    borderRadius: 3,
                                    backgroundColor: on ? fill : colors.line2,
                                    borderWidth: isToday ? 1.5 : 0,
                                    borderColor: colors.ink
                                }}
                            />
                        )
                    })}
                </View>
            ))}
        </View>
    )
}
