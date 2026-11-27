// Choosing and removing your profile picture, from Settings. The photo is
// picked and cropped square on the phone (see usePickSquarePhoto); the server
// shrinks it again and drops its metadata.

import { useAtom } from "jotai"
import { removeAvatar, uploadAvatar, useApi } from "@shared/index"
import { userAtom } from "../../auth"
import { showMenu } from "../../ui/menu"
import { useAppData } from "../common/AppData"
import {
    jpegUpload,
    showUploadError,
    usePickSquarePhoto
} from "../common/photo"

/**
 * `open` shows a menu to choose a new picture or remove the current one.
 * Render `element` (the crop screen, while one is open) on the same screen.
 */
export function useAvatarActions() {
    const api = useApi()
    const [user, setUser] = useAtom(userAtom)
    const { reload } = useAppData()
    const photo = usePickSquarePhoto()

    async function choose() {
        const uri = await photo.pick()
        if (!uri || !user) return
        try {
            const { avatarVersion } = await uploadAvatar(api, jpegUpload(uri))
            setUser({ ...user, avatarVersion })
            // Competitions and the feed show it too.
            reload()
        } catch (err) {
            showUploadError("Couldn't save your picture", err)
        }
    }

    async function remove() {
        if (!user) return
        try {
            await removeAvatar(api)
            setUser({ ...user, avatarVersion: null })
            reload()
        } catch (err) {
            showUploadError("Couldn't remove your picture", err)
        }
    }

    /** The menu: choose, remove (if there's one to remove), or cancel. */
    function open() {
        showMenu("Profile picture", [
            { label: "Choose photo", run: () => void choose() },
            ...(user?.avatarVersion != null
                ? [
                      {
                          label: "Remove photo",
                          destructive: true,
                          run: () => void remove()
                      }
                  ]
                : [])
        ])
    }

    return { open, element: photo.element }
}
