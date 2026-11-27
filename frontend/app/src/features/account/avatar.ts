// Choosing and removing your profile picture, from Settings. The photo is cut
// to its middle square and shrunk here, so the upload is small; the server
// shrinks it again and drops its metadata.

import { Alert } from "react-native"
import { File } from "expo-file-system"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import * as ImagePicker from "expo-image-picker"
import { useAtom } from "jotai"
import { ApiError, removeAvatar, uploadAvatar, useApi } from "@shared/index"
import { userAtom } from "../../auth"
import { useAppData } from "../common/AppData"

/** Side of the square uploaded; the server stores it at half this. */
const UPLOAD_SIZE = 768

/**
 * The middle square of the photo at [uri], at most [UPLOAD_SIZE] on a side, as
 * a JPEG file. Reads HEIC too, so the picker can hand over the original.
 */
async function squareJpeg(uri: string): Promise<string> {
    const context = ImageManipulator.manipulate(uri)
    // Rendered once for its size, upright whatever the photo's orientation.
    const { width, height } = await context.renderAsync()
    const side = Math.min(width, height)
    context.crop({
        originX: Math.floor((width - side) / 2),
        originY: Math.floor((height - side) / 2),
        width: side,
        height: side
    })
    if (side > UPLOAD_SIZE) context.resize({ width: UPLOAD_SIZE })
    const image = await context.renderAsync()
    const saved = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.85
    })
    return saved.uri
}

function failed(title: string, err: unknown) {
    // Anything but the server's answer goes with its message, so a failure on
    // the phone isn't mistaken for a bad connection.
    Alert.alert(
        title,
        err instanceof ApiError
            ? err.messages.join("\n")
            : `Check your connection and try again.${
                  err instanceof Error ? `\n\n${err.message}` : ""
              }`
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
        // No allowsEditing: on iOS it swaps the system photo picker, which
        // opens at once, for the old in-app one, slow to open and to crop.
        // The original as it's stored (often HEIC) skips a slow conversion.
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            preferredAssetRepresentationMode:
                ImagePicker.UIImagePickerPreferredAssetRepresentationMode
                    .Current
        })
        if (result.canceled || !user) return
        try {
            // Read through expo-file-system: Expo's fetch only sends a file
            // part it can get the bytes of.
            const file = new File(await squareJpeg(result.assets[0].uri))
            const { avatarVersion } = await uploadAvatar(api, {
                name: "avatar.jpg",
                type: "image/jpeg",
                bytes: () => file.bytes()
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
