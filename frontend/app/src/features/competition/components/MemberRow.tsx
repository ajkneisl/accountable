// One member's row on a ranked competition page (standings, leaderboard): their
// rank in their own color (with a profile picture, the picture ringed in it and
// the rank on a badge at its corner), their name with a value at the right, and
// a second line underneath for whatever the page measures them by.

import type { ReactNode } from "react"
import { Text, View } from "react-native"
import { useColors, useScheme } from "../../../theme"
import { Avatar } from "../../../ui/Avatar"
import { onMemberFill } from "../colors"

const BADGE = 32
/** The rank's badge on a picture's corner. */
const RANK = 18

export function MemberRow({
    rank,
    color,
    userID,
    username,
    avatarVersion,
    isMe,
    divided,
    value,
    children
}: {
    rank: number
    /** The member's fill. */
    color: string
    userID: string
    username: string
    /** From the member's API record; absent if they have no picture. */
    avatarVersion?: number | null
    isMe: boolean
    /** Rules the row off from the one above it. */
    divided: boolean
    /** Shown at the right of the name, e.g. a count. */
    value: ReactNode
    /** The line under the name. */
    children: ReactNode
}) {
    const scheme = useScheme()
    const colors = useColors()
    const onColor = onMemberFill(color, scheme)
    return (
        <View
            className={`flex-row items-center gap-3.5 px-5 py-4 ${
                divided ? "border-t border-line-2" : ""
            } ${isMe ? "bg-bg-sunken" : ""}`}
        >
            {avatarVersion != null ? (
                <View>
                    <Avatar
                        userID={userID}
                        username={username}
                        avatarVersion={avatarVersion}
                        fill={color}
                        onFill={onColor}
                        size={BADGE}
                        ring={2}
                    />
                    {/* Ringed in the row's background, so it reads on the picture. */}
                    <View
                        style={{
                            position: "absolute",
                            right: -5,
                            bottom: -4,
                            minWidth: RANK,
                            height: RANK,
                            borderRadius: RANK / 2,
                            borderWidth: 2,
                            borderColor: isMe ? colors.bgSunken : colors.bgCard,
                            backgroundColor: color
                        }}
                        className="items-center justify-center px-0.5"
                    >
                        <Text
                            style={{ color: onColor }}
                            className="text-[10px] font-bold"
                        >
                            {rank}
                        </Text>
                    </View>
                </View>
            ) : (
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
                        style={{ color: onColor }}
                        className="text-[14px] font-bold"
                    >
                        {rank}
                    </Text>
                </View>
            )}

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
