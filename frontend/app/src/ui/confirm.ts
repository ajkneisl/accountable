// Native replacement for the web's `window.confirm`, which doesn't exist in RN.

import { Alert } from "react-native"

/**
 * Ask for confirmation, resolving true when the user accepts. Dismissing the
 * alert (Android back button) resolves false, same as cancelling.
 */
export function confirm(
    title: string,
    message: string,
    confirmLabel = "OK",
    destructive = false
): Promise<boolean> {
    return new Promise((resolve) => {
        Alert.alert(
            title,
            message,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => resolve(false)
                },
                {
                    text: confirmLabel,
                    style: destructive ? "destructive" : "default",
                    onPress: () => resolve(true)
                }
            ],
            { cancelable: true, onDismiss: () => resolve(false) }
        )
    })
}
