// A competition's icon: its first letter on an ink tile. Stands for the
// competition on the Competitions tab and over its goals on the Goals tab.

import { View } from "react-native"
import { Mono } from "../../../ui/primitives"

export function CompetitionIcon({
    name,
    size = 40
}: {
    name: string
    /** Width and height, in points. */
    size?: number
}) {
    return (
        <View
            className="items-center justify-center bg-ink"
            style={{ width: size, height: size, borderRadius: size / 4 }}
        >
            <Mono
                className="font-bold text-bg"
                style={{ fontSize: Math.round(size * 0.375) }}
            >
                {(name[0] ?? "?").toUpperCase()}
            </Mono>
        </View>
    )
}
