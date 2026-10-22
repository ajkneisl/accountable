// Session + API wiring for the native app.
//
// The web build keeps tokens in cookies (see web/src/auth.ts). There's no cookie
// jar here, so tokens live in the device keychain via expo-secure-store. That API
// is async while `ApiConfig.getAccessToken` is sync, so the access token is also
// mirrored in memory: `hydrateSession` loads it once at boot and every write keeps
// the two in step.

import { atom, useSetAtom } from "jotai"
import * as SecureStore from "expo-secure-store"
import {
    ApiError,
    type ApiConfig,
    type SelfResponse,
    type TokenResponse,
    getSelf,
    logout,
    refresh,
    useApi
} from "@shared/index"
import { router } from "expo-router"
import { forgetAppleHealth } from "./features/health/AppleHealthData"
import { clearCompetitionsWidget } from "./features/competition/widget/sync"
import { clearGoalsWidget } from "./features/dashboard/widget/sync"
import { clearHabitsWidget } from "./features/habits/widget/sync"

const ACCESS_KEY = "accountable_access"
const REFRESH_KEY = "accountable_refresh"

/**
 * Keychain items stay readable while the phone is locked (once it's been
 * unlocked since boot), so a HealthKit background wake can still sign in.
 */
const KEYCHAIN: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
}

/**
 * Backend origin. Point this at a LAN address (not localhost) when running on a
 * physical device — the phone resolves localhost to itself.
 */
const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080/api"

let accessToken: string | null = null

async function read(key: string): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(key)
    } catch {
        return null
    }
}

async function write(key: string, value: string): Promise<void> {
    try {
        await SecureStore.setItemAsync(key, value, KEYCHAIN)
    } catch {
        // A keychain write failure shouldn't break the session that's already live
        // in memory; the user just has to sign in again next launch.
    }
}

async function remove(key: string): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(key)
    } catch {
        // Nothing to do — the in-memory token is cleared regardless.
    }
}

export const tokenStore = {
    /** Synchronous read of the in-memory access token, for {@link ApiConfig}. */
    getAccess: (): string | null => accessToken,

    getRefresh: (): Promise<string | null> => read(REFRESH_KEY),

    async set(tokens: TokenResponse): Promise<void> {
        accessToken = tokens.accessToken
        await Promise.all([
            write(ACCESS_KEY, tokens.accessToken),
            write(REFRESH_KEY, tokens.refreshToken)
        ])
    },

    async clear(): Promise<void> {
        accessToken = null
        await Promise.all([remove(ACCESS_KEY), remove(REFRESH_KEY)])
    }
}

/**
 * Load the stored access token into memory. Resolves to true when there's a token
 * worth validating against `GET /user`, so the root layout knows whether to show
 * the boot spinner or go straight to the sign-in screen.
 */
export async function hydrateSession(): Promise<boolean> {
    accessToken = await read(ACCESS_KEY)
    return accessToken != null
}

/**
 * Restore the stored session at launch: validate the access token, and if it has
 * expired (they last a day) trade the refresh token for a new pair. The session
 * is only dropped when the server rejects it — a network failure keeps the
 * tokens for the next launch, since a background wake may well be offline.
 */
export async function restoreSession(
    api: ApiConfig
): Promise<SelfResponse | null> {
    if (!(await hydrateSession())) return null

    try {
        const me = await getSelf(api)
        // Re-save so tokens stored before KEYCHAIN existed pick up its accessibility.
        const stored = await tokenStore.getRefresh()
        if (accessToken && stored) {
            await Promise.all([
                write(ACCESS_KEY, accessToken),
                write(REFRESH_KEY, stored)
            ])
        }
        return me
    } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) return null
    }

    const stored = await tokenStore.getRefresh()
    if (!stored) {
        await tokenStore.clear()
        return null
    }
    try {
        await tokenStore.set(await refresh(api, stored))
        return await getSelf(api)
    } catch (err) {
        if (err instanceof ApiError) await tokenStore.clear()
        return null
    }
}

export const apiConfig: ApiConfig = {
    baseUrl,
    getAccessToken: tokenStore.getAccess
}

export const userAtom = atom<SelfResponse | null>(null)

export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null)

/** Returns a handler that revokes the session, clears tokens, and returns to sign-in. */
export function useSignOut() {
    const api = useApi()
    const setUser = useSetAtom(userAtom)
    return async () => {
        const refresh = await tokenStore.getRefresh()
        if (refresh) await logout(api, refresh).catch(() => {})
        await tokenStore.clear()
        clearHabitsWidget()
        clearCompetitionsWidget()
        clearGoalsWidget()
        await forgetAppleHealth()
        setUser(null)
        router.replace("/welcome")
    }
}
