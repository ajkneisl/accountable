// A labelled headline statistic.

import { Text, View } from "react-native"
import { Eyebrow, Mono } from "../../../ui/primitives"

export function Stat({
    label,
    value,
    sub,
    tone
}: {
    label: string
    value: string
    sub: string
    tone?: "lime" | "coral"
}) {
    const toneClass =
        tone === "lime"
            ? "text-lime-ink"
            : tone === "coral"
              ? "text-coral-ink"
              : "text-ink"
    return (
        <View className="flex-1">
            <Eyebrow className="mb-2">{label}</Eyebrow>
            <Mono
                style={{ fontSize: 36, letterSpacing: -1 }}
                className={`font-bold ${toneClass}`}
            >
                {value}
            </Mono>
            <Text className="mt-1.5 text-xs text-ink-3">{sub}</Text>
        </View>
    )
}
