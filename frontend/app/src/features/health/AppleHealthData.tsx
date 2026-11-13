// Apple Health connection state for the signed-in app. "Connected" is a
// device-local choice — HealthKit permission lives on the phone, not the
// account — so it's kept in the keychain alongside the session.
//
// While connected, workouts, sleep and steps sync in the background: HealthKit
// background delivery wakes the app (even if it was closed) whenever a workout or
// sleep is saved, and about hourly while steps are being taken. If the UI is
// up, this provider's change listener runs the sync; a wake with no UI (the app
// was closed) is handled by integration/backgroundSync instead, through
// watchAppleHealth and syncAppleHealthInBackground. The provider also syncs on
// launch and on return to the foreground, once the last sync is more than a
// few minutes old, and the periodic background task syncs too.

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
import { type ApiConfig, useApi } from "@shared/index"
import { useAppData } from "../common/AppData"
import { isSyncRunning } from "../integration/syncGuard"
import { requestScreenTimeSync } from "../screenTime/ScreenTimeData"
import {
    disableBackgroundSync,
    enableBackgroundSync,
    hasRequestedAppleHealthAccess,
    isAppleHealthSupported,
    listenForHealthChanges,
    onHealthChange,
    requestAppleHealthAccess,
    type HealthChange,
    syncAppleHealthSleep,
    syncAppleHealthSteps,
    syncAppleHealthWorkouts
} from "./appleHealth"

/**
 * "1" once connected, "0" once disconnected. Missing (never set, or lost) falls
 * back to whether HealthKit's permission sheet has been answered.
 */
const CONNECTED_KEY = "accountable_apple_health"
/**
 * Workouts' last sync. Renamed (v2) when more workout types were recognized, so
 * every device re-sends its last month of workouts once and ones imported as
 * Other pick up their real type.
 */
const LAST_SYNC_KEY = "accountable_apple_health_synced_v2"
/**
 * Sleep's own last sync. Kept apart from workouts' so links made before sleep
 * was read still get a full backfill of it. Renamed (v2) when nights stopped
 * splitting at a wake-up before midnight, so every device re-sends its last
 * month of sleep once with the corrected totals.
 */
const SLEEP_SYNC_KEY = "accountable_apple_health_sleep_synced_v2"
/** Steps' own last sync, for the same reason as sleep's. */
const STEPS_SYNC_KEY = "accountable_apple_health_steps_synced"

/** How far back the first sync (of workouts, and separately of sleep and steps) reaches. */
const BACKFILL_MS = 30 * 86_400_000

/**
 * Re-read this much before the last sync: Health can receive a workout late
 * (e.g. a watch syncing hours after the fact). Duplicates are skipped server-side.
 */
const OVERLAP_MS = 2 * 86_400_000

/** Opening the app syncs only when the last sync is older than this. */
const STALE_MS = 5 * 60_000

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
        // Explicitly off, so the HealthKit permission fallback doesn't reconnect.
        writeKey(CONNECTED_KEY, "0"),
        writeKey(LAST_SYNC_KEY, null),
        writeKey(SLEEP_SYNC_KEY, null),
        writeKey(STEPS_SYNC_KEY, null)
    ])
}

/**
 * Import workouts since [from] (the last sync, or null for a first sync), and
 * sleep and steps since their own last syncs, then record [now] as the last
 * sync of all three. Resolves to whether anything changed.
 */
async function importSince(
    api: ApiConfig,
    from: number | null,
    now: number
): Promise<boolean> {
    const since = from === null ? now - BACKFILL_MS : from - OVERLAP_MS
    const imported = await syncAppleHealthWorkouts(api, since)
    const [sleepSynced, stepsSynced] = await Promise.all([
        readKey(SLEEP_SYNC_KEY),
        readKey(STEPS_SYNC_KEY)
    ])
    const sinceLast = (synced: string | null) =>
        synced === null ? now - BACKFILL_MS : Number(synced) - OVERLAP_MS
    const sleepChanged = await syncAppleHealthSleep(api, sinceLast(sleepSynced))
    const stepsChanged = await syncAppleHealthSteps(api, sinceLast(stepsSynced))
    await Promise.all([
        writeKey(LAST_SYNC_KEY, String(now)),
        writeKey(SLEEP_SYNC_KEY, String(now)),
        writeKey(STEPS_SYNC_KEY, String(now))
    ])
    return imported > 0 || sleepChanged > 0 || stepsChanged > 0
}

/** The import now running: where it reads from, and when it started. */
let running: {
    from: number | null
    started: number
    result: Promise<boolean>
} | null = null

/**
 * {@link importSince}, one at a time: a call made while the same import is
 * running shares its result. A launch can start one from the background wake
 * and another from the provider mounting, and they'd both read and post the
 * same thing.
 */
function importOnce(
    api: ApiConfig,
    from: number | null,
    now: number
): Promise<boolean> {
    if (running && running.from === from && isSyncRunning(running.started))
        return running.result
    const mine = { from, started: now, result: importSince(api, from, now) }
    running = mine
    const done = () => {
        if (running === mine) running = null
    }
    mine.result.then(done, done)
    return mine.result
}

/**
 * Sync from the stored last sync if Health is linked, for the background task,
 * which runs without the provider. Only an explicit link counts: the permission
 * fallback is left to the provider, which records it.
 */
export async function syncAppleHealthInBackground(
    api: ApiConfig
): Promise<void> {
    if (!isAppleHealthSupported()) return
    if ((await readKey(CONNECTED_KEY)) !== "1") return
    const synced = await readKey(LAST_SYNC_KEY)
    await importOnce(api, synced ? Number(synced) : null, Date.now())
}

/** Whether a mounted provider is handling Health changes itself. */
let providerListening = false

/**
 * Call [onChange] for Health changes that no mounted provider is handling: iOS
 * woke the app in the background with no UI, so nothing else will sync. Starts
 * the native subscription if Health is linked, which also delivers the change
 * that caused the wake.
 */
export async function watchAppleHealth(
    onChange: (change: HealthChange) => void
): Promise<void> {
    if (!isAppleHealthSupported()) return
    onHealthChange((change) => {
        if (!providerListening) onChange(change)
    })
    let linked: boolean
    try {
        linked = (await SecureStore.getItemAsync(CONNECTED_KEY)) === "1"
    } catch {
        // The keychain can't be read (the phone hasn't been unlocked since it
        // restarted), which doesn't mean Health isn't linked. Listen anyway,
        // or this launch would never hear a change; each sync checks the link.
        linked = true
    }
    if (linked) listenForHealthChanges()
}

export function AppleHealthProvider({ children }: { children: ReactNode }) {
    const api = useApi()
    const { reload } = useAppData()
    const supported = useMemo(isAppleHealthSupported, [])
    const [connected, setConnected] = useState(false)
    const [lastSync, setLastSync] = useState<number | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    /** When the sync now running started, or null (see syncGuard). */
    const inFlight = useRef<number | null>(null)
    // Read by the change listener, which shouldn't resubscribe on every sync.
    const lastSyncRef = useRef<number | null>(null)

    const sync = useCallback(
        async (from: number | null) => {
            if (isSyncRunning(inFlight.current)) return
            const now = Date.now()
            inFlight.current = now
            setSyncing(true)
            setError(null)
            try {
                const changed = await importOnce(api, from, now)
                setLastSync(now)
                lastSyncRef.current = now
                if (changed) reload()
            } catch (err) {
                setError(err instanceof Error ? err.message : "Sync failed")
            } finally {
                // Unless a newer sync has taken over from this one.
                if (inFlight.current === now) {
                    inFlight.current = null
                    setSyncing(false)
                }
            }
        },
        [api, reload]
    )

    /** Sync on app open, unless the last sync was only moments ago. */
    const syncIfStale = useCallback(() => {
        const last = lastSyncRef.current
        if (last === null || Date.now() - last > STALE_MS) void sync(last)
    }, [sync])

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
            const isConnected =
                flag === "1" ||
                (flag !== "0" && (await hasRequestedAppleHealthAccess()))
            if (isConnected) {
                setConnected(true)
                if (flag !== "1") await writeKey(CONNECTED_KEY, "1")
                // Links made before sleep or steps were read haven't been asked for them;
                // iOS only shows the sheet for types it hasn't asked about yet.
                // Skipped on a background wake, where no sheet can show.
                if (AppState.currentState === "active")
                    await requestAppleHealthAccess().catch(() => {})
                // Covers links made before background sync existed.
                void enableBackgroundSync().catch(() => {})
                syncIfStale()
            }
        })()
    }, [supported, syncIfStale])

    useEffect(() => {
        if (!connected) return
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") syncIfStale()
        })
        // A Health change may be the only time iOS wakes the app in the
        // background, so it brings Screen Time along too.
        providerListening = true
        const unsubscribe = onHealthChange((change) => {
            // Steps change constantly, so they only sync once the last one is
            // stale. In the background that's the hourly wake, which is what
            // lets the server notice a step goal is nearly met.
            const last = lastSyncRef.current
            if (
                change === "steps" &&
                last !== null &&
                Date.now() - last <= STALE_MS
            )
                return
            void sync(last)
            requestScreenTimeSync()
        })
        return () => {
            providerListening = false
            sub.remove()
            unsubscribe()
        }
    }, [connected, sync, syncIfStale])

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

    const syncNow = useCallback(() => sync(lastSyncRef.current), [sync])

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
