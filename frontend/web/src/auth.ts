// Session + API wiring for the website.
//
// Tokens live in cookies so a reload (or a TV left on the billboard for days)
// keeps the session. The access token lasts a day; once its cookie expires, the
// next request 401s and `refreshSession` trades the refresh token for a new pair.

import { atom, getDefaultStore, useSetAtom } from "jotai"
import { useNavigate } from "react-router-dom"
import {
    ApiError,
    type ApiConfig,
    type SelfResponse,
    type TokenResponse,
    displayAccess,
    logout,
    refresh,
    useApi
} from "@shared/index"

const ACCESS_COOKIE = "accountable_access"
const REFRESH_COOKIE = "accountable_refresh"

function readCookie(name: string): string | null {
    const target = `${name}=`
    for (const part of document.cookie.split(";")) {
        const c = part.trim()
        if (c.startsWith(target))
            return decodeURIComponent(c.slice(target.length))
    }
    return null
}

function writeCookie(name: string, value: string, expiresAtMs: number) {
    const secure = location.protocol === "https:" ? "; Secure" : ""
    const expires = new Date(expiresAtMs).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Expires=${expires}; SameSite=Lax${secure}`
}

function clearCookie(name: string) {
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

/** URL parameter carrying a billboard link's token: `/billboard/goals#token=…`. */
const DISPLAY_PARAM = "token"

/**
 * The token from a billboard link, if this page was opened with one. It's read
 * from the fragment (which browsers never send to a server), or the query string
 * for kiosks that drop fragments.
 */
function readDisplayToken(): string | null {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""))
    return (
        hash.get(DISPLAY_PARAM) ??
        new URLSearchParams(location.search).get(DISPLAY_PARAM)
    )
}

/**
 * Set when the page was opened from a billboard link. The session then runs off
 * that token alone — no cookies or storage — so a kiosk only ever needs its URL:
 * the token never expires, and each load trades it for read-only access.
 */
const displayToken = readDisplayToken()

/** True when this page is a read-only display running off a billboard link. */
export const isDisplaySession = displayToken !== null

/** The display's current access token; renewed from {@link displayToken} on a 401. */
let displayAccessToken: string | null = null

/** The link that opens [path] as a read-only display, given the account's token. */
export function displayLink(path: string, token: string): string {
    return `${location.origin}${path}#${DISPLAY_PARAM}=${encodeURIComponent(token)}`
}

export const tokenStore = {
    getAccess: () => readCookie(ACCESS_COOKIE),
    getRefresh: () => readCookie(REFRESH_COOKIE),
    /** True when there's any stored session worth validating at load. */
    hasSession: () =>
        isDisplaySession ||
        readCookie(ACCESS_COOKIE) != null ||
        readCookie(REFRESH_COOKIE) != null,
    set(tokens: TokenResponse) {
        writeCookie(
            ACCESS_COOKIE,
            tokens.accessToken,
            tokens.accessTokenExpiresAt
        )
        writeCookie(
            REFRESH_COOKIE,
            tokens.refreshToken,
            tokens.refreshTokenExpiresAt
        )
    },
    clear() {
        clearCookie(ACCESS_COOKIE)
        clearCookie(REFRESH_COOKIE)
    }
}

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api"

export const userAtom = atom<SelfResponse | null>(null)

export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null)

/** Drop the local session; clearing {@link userAtom} sends gated routes to sign-in. */
function endSession() {
    tokenStore.clear()
    getDefaultStore().set(userAtom, null)
}

let inflightRefresh: Promise<boolean> | null = null

/**
 * {@link ApiConfig.onUnauthorized}: trade the refresh token for a new pair after
 * a 401. Each exchange replaces the refresh token, so concurrent 401s (or another
 * tab) share one, and a request rejected with an already-replaced token just
 * retries. The session only ends when the server rejects the refresh token — a
 * network blip leaves it alone, so a wall display recovers on its next poll.
 */
async function refreshSession(rejectedToken: string | null): Promise<boolean> {
    const current = tokenStore.getAccess()
    if (current && current !== rejectedToken) return true

    inflightRefresh ??= (async () => {
        const stored = tokenStore.getRefresh()
        if (!stored) {
            endSession()
            return false
        }
        try {
            tokenStore.set(await refresh(apiConfig, stored))
            return true
        } catch (err) {
            if (err instanceof ApiError) endSession()
            return false
        }
    })().finally(() => {
        inflightRefresh = null
    })

    return inflightRefresh
}

let inflightDisplay: Promise<boolean> | null = null

/**
 * {@link ApiConfig.onUnauthorized} for a display: trade the link's token for
 * fresh read-only access. Only the server rejecting the token (the link was
 * revoked) ends the display; a network blip is retried on the next poll.
 */
async function refreshDisplay(rejectedToken: string | null): Promise<boolean> {
    if (displayAccessToken && displayAccessToken !== rejectedToken) return true

    inflightDisplay ??= (async () => {
        try {
            const access = await displayAccess(apiConfig, displayToken!)
            displayAccessToken = access.accessToken
            return true
        } catch (err) {
            if (err instanceof ApiError) {
                displayAccessToken = null
                getDefaultStore().set(userAtom, null)
            }
            return false
        }
    })().finally(() => {
        inflightDisplay = null
    })

    return inflightDisplay
}

// A display never touches the cookies, so opening a billboard link in a browser
// that's signed in leaves that session alone.
export const apiConfig: ApiConfig = isDisplaySession
    ? {
          baseUrl,
          getAccessToken: () => displayAccessToken,
          onUnauthorized: refreshDisplay
      }
    : {
          baseUrl,
          getAccessToken: tokenStore.getAccess,
          onUnauthorized: refreshSession
      }

/** Returns a handler that revokes the session, clears tokens, and returns home. */
export function useSignOut() {
    const api = useApi()
    const setUser = useSetAtom(userAtom)
    const navigate = useNavigate()
    return async () => {
        const refresh = tokenStore.getRefresh()
        if (refresh) await logout(api, refresh).catch(() => {})
        tokenStore.clear()
        setUser(null)
        navigate("/")
    }
}
