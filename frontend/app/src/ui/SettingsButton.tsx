// Top-right gear on every tab — settings is a pushed screen, not a tab.

import { router } from "expo-router"
import { colors } from "../theme"
import { CircleButton } from "./CircleButton"
import { GearIcon } from "./icons"

export function SettingsButton() {
    return (
        <CircleButton label="Settings" onPress={() => router.push("/settings")}>
            {(glass) =>
                glass ? (
                    <GearIcon color={colors.ink} size={21} />
                ) : (
                    <GearIcon color={colors.ink2} size={20} />
                )
            }
        </CircleButton>
    )
}
