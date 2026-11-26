// Choosing and removing your profile picture, from Settings. The picker crops
// the photo square; the server shrinks it and drops its metadata.

import { Alert } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useAtom } from "jotai"
import { ApiError, removeAvatar, uploadAvatar, useApi } from "@shared/index"
import { userAtom } from "../../auth"
import { useAppData } from "../common/AppData"

function failed(title: string, err: unknown) {
    Alert.alert(
        title,
        err instanceof ApiError
            ? err.messages.join("\n")
            : "Check your connection and try again."
    )
}

/**
 * Opens a menu to choose a new picture, or remove the current one. Resolves
 * once it's done, or cancelled.
 */
export function useAvatarActions() {
    const api = useApi()
    const [user, setUser] = useAtom(userAtom)
    const { reload } = useAppData()

    async function choose() {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            // A JPEG rather than HEIC, which the server can't read.
            preferredAssetRepresentationMode:
                ImagePicker.UIImagePickerPreferredAssetRepresentationMode
                    .Compatible
        })
        if (result.canceled || !user) return
        const asset = result.assets[0]
        try {
            const { avatarVersion } = await uploadAvatar(api, {
                uri: asset.uri,
                name: asset.fileName ?? "avatar.jpg",
                type: asset.mimeType ?? "image/jpeg"
            })
            setUser({ ...user, avatarVersion })
            // Competitions and the feed show it too.
            reload()
        } catch (err) {
            failed("Couldn't save your picture", err)
        }
    }

    async function remove() {
        if (!user) return
        try {
            await removeAvatar(api)
            setUser({ ...user, avatarVersion: null })
            reload()
        } catch (err) {
            failed("Couldn't remove your picture", err)
        }
    }

    /** The menu: choose, remove (if there's one to remove), or cancel. */
    function open() {
        Alert.alert("Profile picture", undefined, [
            { text: "Choose photo", onPress: () => void choose() },
            ...(user?.avatarVersion != null
                ? [
                      {
                          text: "Remove photo",
                          style: "destructive" as const,
                          onPress: () => void remove()
                      }
                  ]
                : []),
            { text: "Cancel", style: "cancel" as const }
        ])
    }

    return { open }
}
