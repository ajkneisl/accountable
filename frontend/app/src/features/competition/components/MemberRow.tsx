// One member's row on a ranked competition page (standings, leaderboard): their
// rank in their own color, their name with a value at the right, and a second
// line underneath for whatever the page measures them by.

import type { ReactNode } from "react"
import { Text, View } from "react-native"
import { useScheme } from "../../../theme"
import { onMemberFill } from "../colors"

const BADGE = 32

export function MemberRow({
    rank,
    color,
    username,
    isMe,
    divided,
    value,
    children
}: {
    rank: number
    /** The member's fill. */
    color: string
    username: string
    isMe: boolean
    /** Rules the row off from the one above it. */
    divided: boolean
    /** Shown at the right of the name, e.g. a count. */
    value: ReactNode
    /** The line under the name. */
    children: ReactNode
}) {
    const scheme = useScheme()
    return (
        <View
            className={`flex-row items-center gap-3.5 px-5 py-4 ${
                divided ? "border-t border-line-2" : ""
            } ${isMe ? "bg-bg-sunken" : ""}`}
        >
            <View
                style={{
                    width: BADGE,
                    height: BADGE,
                    borderRadius: BADGE / 2,
                    backgroundColor: color
                }}
                className="items-center justify-center"
            >
                <Text
                    style={{ color: onMemberFill(color, scheme) }}
                    className="text-[14px] font-bold"
                >
                    {rank}
                </Text>
            </View>

            <View className="flex-1 gap-2">
                <View className="flex-row items-center gap-2">
                    <Text
                        numberOfLines={1}
                        className="flex-shrink text-[16px] font-semibold text-ink"
                    >
                        {username}
                    </Text>
                    {isMe && (
                        <Text className="text-[11px] text-ink-3">you</Text>
                    )}
                    <View className="flex-1" />
                    {value}
                </View>
                {children}
            </View>
        </View>
    )
}
