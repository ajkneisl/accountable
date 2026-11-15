// A short menu of choices for one thing — a source's Manage, a member's row —
// in place of a row of buttons. An action sheet on iOS, an alert elsewhere.

import { ActionSheetIOS, Alert, Platform } from "react-native"

export type MenuAction = {
    label: string
    /** Marks the choice that removes or disconnects something. */
    destructive?: boolean
    run: () => void
}

/** Show [actions] under [title], with a Cancel after them. */
export function showMenu(title: string, actions: MenuAction[]) {
    if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
            {
                title,
                options: [...actions.map((a) => a.label), "Cancel"],
                cancelButtonIndex: actions.length,
                destructiveButtonIndex: actions.findIndex((a) => a.destructive)
            },
            (index) => actions[index]?.run()
        )
        return
    }
    Alert.alert(title, undefined, [
        ...actions.map((a) => ({
            text: a.label,
            style: a.destructive ? ("destructive" as const) : undefined,
            onPress: a.run
        })),
        { text: "Cancel", style: "cancel" as const }
    ])
}
