// Entry route: dashboard when signed in, otherwise the welcome screen.

import { Redirect } from "expo-router"
import { useAtomValue } from "jotai"
import { isAuthenticatedAtom } from "../auth"

export default function Index() {
    const authed = useAtomValue(isAuthenticatedAtom)
    return <Redirect href={authed ? "/dashboard" : "/welcome"} />
}
