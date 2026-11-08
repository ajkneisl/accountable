// GitHub-style heatmap for one habit: week columns, Sun→Sat rows, sized to
// however many whole weeks fit the available width, with month names along the
// top and Mon / Wed / Fri down the side. Tapping a past day toggles it.

import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { useColors } from "../../../theme"
import { buildGrid, type Cell } from "../grid"

const CELL = 13
const GAP = 3
/** Width of the weekday labels column, and height of the month labels row. */
const DAY_LABEL_W = 24
const MONTH_LABEL_H = 15
/** Columns a month name needs before the next one, so short names don't collide. */
const MONTH_MIN_COLS = 3

/** Labelled rows (Sun = 0), as on GitHub: every other day, leaving Sun and Sat bare. */
const DAY_LABELS: Record<number, string> = { 1: "Mon", 3: "Wed", 5: "Fri" }

const MONTH_FMT = new Intl.DateTimeFormat(undefined, {
    month: "short",
    timeZone: "UTC"
})

/**
 * Month names and the column each starts at: the first week whose Sunday falls in
 * a new month. A name squeezed in before the next is dropped, and the first one
 * only gets a label when it isn't about to be followed by another.
 */
function monthLabels(grid: Cell[][]): { col: number; label: string }[] {
    const starts: { col: number; label: string }[] = []
    let last = ""
    grid.forEach((week, col) => {
        const month = week[0].date.slice(0, 7)
        if (month === last) return
        last = month
        starts.push({
            col,
            label: MONTH_FMT.format(new Date(`${week[0].date}T00:00:00Z`))
        })
    })
    return starts.filter(
        (m, i) =>
            i + 1 >= starts.length ||
            starts[i + 1].col - m.col >= MONTH_MIN_COLS
    )
}

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
    const colors = useColors()
    const [width, setWidth] = useState(0)
    // The weekday labels take a column's worth of room from the weeks.
    const room = width - DAY_LABEL_W - GAP
    const cols = Math.max(1, Math.floor((room + GAP) / (CELL + GAP)))
    const grid = width > 0 ? buildGrid(start, today, cols) : []
    const labelStyle = { fontSize: 10, lineHeight: 12, color: colors.ink3 }

    return (
        <View
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            style={{ height: MONTH_LABEL_H + 7 * CELL + 6 * GAP }}
            className="flex-row justify-end"
        >
            <View
                style={{
                    width: DAY_LABEL_W,
                    marginRight: GAP,
                    paddingTop: MONTH_LABEL_H,
                    gap: GAP
                }}
            >
                {Array.from({ length: 7 }, (_, row) => (
                    <View
                        key={row}
                        style={{ height: CELL, justifyContent: "center" }}
                    >
                        {DAY_LABELS[row] && (
                            <Text style={labelStyle} allowFontScaling={false}>
                                {DAY_LABELS[row]}
                            </Text>
                        )}
                    </View>
                ))}
            </View>
            <View>
                <View style={{ height: MONTH_LABEL_H }}>
                    {monthLabels(grid).map((m) => (
                        <Text
                            key={`${m.col}-${m.label}`}
                            allowFontScaling={false}
                            numberOfLines={1}
                            style={[
                                labelStyle,
                                {
                                    position: "absolute",
                                    left: m.col * (CELL + GAP)
                                }
                            ]}
                        >
                            {m.label}
                        </Text>
                    ))}
                </View>
                <View className="flex-row">
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
                                            style={{
                                                width: CELL,
                                                height: CELL
                                            }}
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
                                            backgroundColor: on
                                                ? fill
                                                : colors.line2,
                                            borderWidth: isToday ? 1.5 : 0,
                                            borderColor: colors.ink
                                        }}
                                    />
                                )
                            })}
                        </View>
                    ))}
                </View>
            </View>
        </View>
    )
}
