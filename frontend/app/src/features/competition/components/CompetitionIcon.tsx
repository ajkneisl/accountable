// A competition's icon: the picture its owner uploaded, or the emoji they
// picked, or until either, its first letter on an ink tile. Stands for the
// competition on the Competitions tab, over its goals on the Goals tab, and on
// feed cards.

import { useState } from "react"
import { Image, Text, View } from "react-native"
import { competitionPictureUrl } from "@shared/index"
import { apiConfig } from "../../../auth"
import { Mono } from "../../../ui/primitives"

export function CompetitionIcon({
    id,
    name,
    icon,
    pictureVersion,
    size = 40
}: {
    id: string
    name: string
    /** The emoji its owner picked, if any. */
    icon?: string | null
    /** From its API record; absent if it has no picture. */
    pictureVersion?: number | null
    /** Width and height, in points. */
    size?: number
}) {
    const uri = competitionPictureUrl(apiConfig, id, pictureVersion)
    // The URL that failed, so a new picture gets its own try.
    const [failed, setFailed] = useState<string | null>(null)
    const tile = { width: size, height: size, borderRadius: size / 4 }

    if (uri && failed !== uri) {
        return (
            <Image
                source={{ uri }}
                onError={() => setFailed(uri)}
                accessibilityIgnoresInvertColors
                style={tile}
                className="bg-bg-sunken"
            />
        )
    }

    if (icon) {
        return (
            <View
                className="items-center justify-center bg-bg-sunken"
                style={tile}
            >
                <Text style={{ fontSize: Math.round(size * 0.55) }}>
                    {icon}
                </Text>
            </View>
        )
    }

    return (
        <View className="items-center justify-center bg-ink" style={tile}>
            <Mono
                className="font-bold text-bg"
                style={{ fontSize: Math.round(size * 0.375) }}
            >
                {(name[0] ?? "?").toUpperCase()}
            </Mono>
        </View>
    )
}
