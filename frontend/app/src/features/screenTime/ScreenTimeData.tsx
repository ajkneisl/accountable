// Screen Time connection state for the signed-in app. Like Apple Health it's a
// device-local link — authorization, the picked apps and the monitor all live
// on the phone — so "connected" is read straight from the native side.
//
// The monitor extension records usage on its own; while connected, the app
// posts what it recorded on launch and whenever it returns to the foreground,
// once the last sync is more than a few minutes old.

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
import { useApi } from "@shared/index"
import { useAppData } from "../common/AppData"
import {
    chooseScreenTimeApps,
    connectScreenTime,
    ensureScreenTimeMonitoring,
    forgetScreenTime,
    isScreenTimeConnected,
    isScreenTimeSupported,
    screenTimeStatus,
    syncScreenTime,
    type ScreenTimeStatus
} from "./screenTime"

/** Opening the app syncs only when the last sync is older than this. */
const STALE_MS = 5 * 60_000

interface ScreenTime {
    supported: boolean
    connected: boolean
    syncing: boolean
    lastSync: number | null
    /** What the phone has recorded, as of the last sync. */
    status: ScreenTimeStatus
    error: string | null
    connect: () => Promise<void>
    chooseApps: () => Promise<void>
    disconnect: () => void
    syncNow: () => Promise<void>
}

const ScreenTimeContext = createContext<ScreenTime | null>(null)

export function useScreenTime(): ScreenTime {
    const ctx = useContext(ScreenTimeContext)
    if (!ctx) {
        throw new Error(
            "useScreenTime must be used within <ScreenTimeProvider>"
        )
    }
    return ctx
}

export function ScreenTimeProvider({ children }: { children: ReactNode }) {
    const api = useApi()
    const { reload } = useAppData()
    const supported = useMemo(isScreenTimeSupported, [])
    const [connected, setConnected] = useState(() => isScreenTimeConnected())
    const [lastSync, setLastSync] = useState<number | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [status, setStatus] = useState<ScreenTimeStatus>(screenTimeStatus)
    const [error, setError] = useState<string | null>(null)
    const inFlight = useRef(false)
    const lastSyncRef = useRef<number | null>(null)

    const sync = useCallback(async () => {
        if (inFlight.current) return
        inFlight.current = true
        setSyncing(true)
        setError(null)
        try {
            setStatus(screenTimeStatus())
            const changed = await syncScreenTime(api)
            const now = Date.now()
            setLastSync(now)
            lastSyncRef.current = now
            if (changed > 0) reload()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sync failed")
        } finally {
            inFlight.current = false
            setSyncing(false)
        }
    }, [api, reload])

    const syncIfStale = useCallback(() => {
        const last = lastSyncRef.current
        if (last === null || Date.now() - last > STALE_MS) void sync()
    }, [sync])

    useEffect(() => {
        if (!connected) return
        try {
            ensureScreenTimeMonitoring()
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Couldn't restart Screen Time"
            )
        }
        syncIfStale()
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") syncIfStale()
        })
        return () => sub.remove()
    }, [connected, syncIfStale])

    const connect = useCallback(async () => {
        setError(null)
        try {
            if (!(await connectScreenTime())) return
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Couldn't connect Screen Time"
            )
            return
        }
        setConnected(true)
        await sync()
    }, [sync])

    const chooseApps = useCallback(async () => {
        setError(null)
        try {
            if (await chooseScreenTimeApps()) await sync()
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Couldn't update apps"
            )
        }
    }, [sync])

    const disconnect = useCallback(() => {
        forgetScreenTime()
        setConnected(false)
        setLastSync(null)
        lastSyncRef.current = null
    }, [])

    const value = useMemo(
        () => ({
            supported,
            connected,
            syncing,
            lastSync,
            status,
            error,
            connect,
            chooseApps,
            disconnect,
            syncNow: sync
        }),
        [
            supported,
            connected,
            syncing,
            lastSync,
            status,
            error,
            connect,
            chooseApps,
            disconnect,
            sync
        ]
    )

    return (
        <ScreenTimeContext.Provider value={value}>
            {children}
        </ScreenTimeContext.Provider>
    )
}
