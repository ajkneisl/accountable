// A join code that arrived by link (beacc.app/join/CODE) and is waiting for the
// Competitions tab to open the join sheet with it. Held across sign-in, so a
// link opened while signed out still lands in the sheet afterwards.

import { atom, getDefaultStore } from "jotai"

export const pendingJoinCodeAtom = atom<string | null>(null)

/** The shareable link for a join code. */
export function joinLink(code: string): string {
    return `https://beacc.app/join/${encodeURIComponent(code)}`
}

/** Where to land after signing in: the join sheet if a link is waiting, else the dashboard. */
export function homeAfterSignIn(): "/competitions" | "/dashboard" {
    return getDefaultStore().get(pendingJoinCodeAtom)
        ? "/competitions"
        : "/dashboard"
}
