// A boxed chevron in a dashboard card's header, marking that tapping the card
// opens its tab.

import { View } from "react-native"
import { colors } from "../../../theme"
import { ChevronIcon } from "../../../ui/icons"

export function OpenBox() {
    return (
        <View className="h-7 w-7 items-center justify-center rounded-[8px] border border-line bg-bg-card">
            <ChevronIcon color={colors.ink2} size={16} />
        </View>
    )
}
