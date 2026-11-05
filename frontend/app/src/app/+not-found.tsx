// A route that doesn't exist, such as a notification or link from another version
// of the app. Goes somewhere useful rather than showing the router's error page.
// Points straight at the destination, not "/", so it can't redirect back here.

import { Redirect } from "expo-router"
import { useAtomValue } from "jotai"
import { isAuthenticatedAtom } from "../auth"

export default function NotFound() {
    const authed = useAtomValue(isAuthenticatedAtom)
    return <Redirect href={authed ? "/home" : "/welcome"} />
}
