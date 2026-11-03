// Join link — beacc.app/join/CODE (a universal link) or accountable://join/CODE.
//
// Lives outside (app) so a signed-out user isn't bounced to /welcome before the
// code is saved. The Competitions tab picks the code up and opens the join sheet.

import { useEffect } from "react"
import { Redirect, useLocalSearchParams } from "expo-router"
import { useAtomValue, useSetAtom } from "jotai"
import { isAuthenticatedAtom } from "../../auth"
import { pendingJoinCodeAtom } from "../../features/competition/pendingJoin"

export default function Join() {
    const { code } = useLocalSearchParams<{ code: string }>()
    const authed = useAtomValue(isAuthenticatedAtom)
    const setPending = useSetAtom(pendingJoinCodeAtom)

    useEffect(() => {
        const trimmed = code?.trim()
        if (trimmed) setPending(trimmed.toUpperCase())
    }, [code, setPending])

    return <Redirect href={authed ? "/competitions" : "/welcome"} />
}
