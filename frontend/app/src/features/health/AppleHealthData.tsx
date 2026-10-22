// Apple Health connection state for the signed-in app. "Connected" is a
// device-local choice — HealthKit permission lives on the phone, not the
// account — so it's kept in the keychain alongside the session.
//
// While connected, workouts sync in the background: HealthKit background
// delivery wakes the app (even if it was closed) whenever a workout is saved,
// the app boots, this provider mounts, and the change listener runs a sync. It
// also syncs on launch and on every return to the foreground.

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode
} from "react"
import { AppState } from "react-native"
import * as SecureStore from "expo-secure-store"
import { useApi } from "@shared/index"
import { useAppData } from "../common/AppData"
import {
    disableBackgroundSync,
    enableBackgroundSync,
    isAppleHealthSupported,
    onWorkoutsChanged,
    requestAppleHealthAccess,
    syncAppleHealthWorkouts
} from "./appleHealth"

const CONNECTED_KEY = "accountable_apple_health"
const LAST_SYNC_KEY = "accountable_apple_health_synced"

/** How far back the first sync reaches. */
const BACKFILL_MS = 30 * 86_400_000

/**
 * Re-read this much before the last sync: Health can receive a workout late
 * (e.g. a watch syncing hours after the fact). Duplicates are skipped server-side.
 */
const OVERLAP_MS = 2 * 86_400_000

interface AppleHealth {
    supported: boolean
    connected: boolean
    syncing: boolean
    lastSync: number | null
    error: string | null
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    syncNow: () => Promise<void>
}

const AppleHealthContext = createContext<AppleHealth | null>(null)

export function useAppleHealth(): AppleHealth {
    const ctx = useContext(AppleHealthContext)
    if (!ctx) {
        throw new Error(
            "useAppleHealth must be used within <AppleHealthProvider>"
        )
    }
    return ctx
}

async function readKey(key: string): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(key)
    } catch {
        return null
    }
}

async function writeKey(key: string, value: string | null): Promise<void> {
    try {
        if (value === null) await SecureStore.deleteItemAsync(key)
        // Readable while locked, for syncs started by a background wake.
        else
            await SecureStore.setItemAsync(key, value, {
                keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
            })
    } catch {
        // Losing this only means the next sync re-reads a wider window.
    }
}

/** Drop the device's Apple Health link, e.g. on sign-out so the next account starts fresh. */
export async function forgetAppleHealth(): Promise<void> {
    await disableBackgroundSync().catch(() => {})
    await Promise.all([
        writeKey(CONNECTED_KEY, null),
        writeKey(LAST_SYNC_KEY, null)
    ])
}

export function AppleHealthProvider({ children }: { children: ReactNode }) {
    const api = useApi()
    const { reload } = useAppData()
    const supported = useMemo(isAppleHealthSupported, [])
    const [connected, setConnected] = useState(false)
    const [lastSync, setLastSync] = useState<number | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inFlight = useRef(false)
    // Read by the change listener, which shouldn't resubscribe on every sync.
    const lastSyncRef = useRef<number | null>(null)

    const sync = useCallback(
        async (from: number | null) => {
            if (inFlight.current) return
            inFlight.current = true
            setSyncing(true)
            setError(null)
            try {
                const now = Date.now()
                const since =
                    from === null ? now - BACKFILL_MS : from - OVERLAP_MS
                const imported = await syncAppleHealthWorkouts(api, since)
                setLastSync(now)
                lastSyncRef.current = now
                await writeKey(LAST_SYNC_KEY, String(now))
                if (imported > 0) reload()
            } catch (err) {
                setError(err instanceof Error ? err.message : "Sync failed")
            } finally {
                inFlight.current = false
                setSyncing(false)
            }
        },
        [api, reload]
    )

    // Restore the stored state, then catch up on anything logged since.
    useEffect(() => {
        if (!supported) return
        ;(async () => {
            const [flag, synced] = await Promise.all([
                readKey(CONNECTED_KEY),
                readKey(LAST_SYNC_KEY)
            ])
            const last = synced ? Number(synced) : null
            setLastSync(last)
            lastSyncRef.current = last
            if (flag === "1") {
                setConnected(true)
                // Covers links made before background sync existed.
                void enableBackgroundSync().catch(() => {})
                void sync(last)
            }
        })()
    }, [supported, sync])

    useEffect(() => {
        if (!connected) return
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") void sync(lastSyncRef.current)
        })
        const unsubscribe = onWorkoutsChanged(
            () => void sync(lastSyncRef.current)
        )
        return () => {
            sub.remove()
            unsubscribe()
        }
    }, [connected, sync])

    const connect = useCallback(async () => {
        setError(null)
        try {
            await requestAppleHealthAccess()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't connect")
            return
        }
        setConnected(true)
        await writeKey(CONNECTED_KEY, "1")
        await enableBackgroundSync().catch(() => {})
        await sync(null)
    }, [sync])

    const disconnect = useCallback(async () => {
        setConnected(false)
        setLastSync(null)
        lastSyncRef.current = null
        await forgetAppleHealth()
    }, [])

    const syncNow = useCallback(() => sync(lastSync), [sync, lastSync])

    const value = useMemo(
        () => ({
            supported,
            connected,
            syncing,
            lastSync,
            error,
            connect,
            disconnect,
            syncNow
        }),
        [
            supported,
            connected,
            syncing,
            lastSync,
            error,
            connect,
            disconnect,
            syncNow
        ]
    )

    return (
        <AppleHealthContext.Provider value={value}>
            {children}
        </AppleHealthContext.Provider>
    )
}
