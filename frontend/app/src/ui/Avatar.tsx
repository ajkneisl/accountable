// A person's avatar: their profile picture, or until they add one (or while it
// can't load), their initial on their color. With [ring], a picture is ringed
// in their color, so they're still told apart by it.

import { useState } from "react"
import { Image, Text, View } from "react-native"
import { avatarUrl } from "@shared/index"
import { apiConfig } from "../auth"

export function Avatar({
    userID,
    username,
    avatarVersion,
    fill,
    onFill,
    size,
    ring = 0
}: {
    userID: string
    username: string
    /** From the person's API record; absent if they have no picture. */
    avatarVersion?: number | null
    /** Their color, behind the initial. */
    fill: string
    /** Text that reads on [fill]. */
    onFill: string
    /** Diameter, in points. */
    size: number
    /** Width of the ring in [fill] round a picture; 0 for none. */
    ring?: number
}) {
    const uri = avatarUrl(apiConfig, userID, avatarVersion)
    // The URL that failed, so a new picture gets its own try.
    const [failed, setFailed] = useState<string | null>(null)
    const circle = { width: size, height: size, borderRadius: size / 2 }

    if (uri && failed !== uri) {
        const inner = size - 2 * ring
        return (
            <View
                style={[circle, { backgroundColor: fill }]}
                className="items-center justify-center"
            >
                <Image
                    source={{ uri }}
                    onError={() => setFailed(uri)}
                    accessibilityIgnoresInvertColors
                    style={{
                        width: inner,
                        height: inner,
                        borderRadius: inner / 2
                    }}
                />
            </View>
        )
    }

    return (
        <View
            style={[circle, { backgroundColor: fill }]}
            className="items-center justify-center"
        >
            <Text
                style={{ color: onFill, fontSize: Math.round(size * 0.4) }}
                className="font-bold"
            >
                {(username[0] ?? "?").toUpperCase()}
            </Text>
        </View>
    )
}
