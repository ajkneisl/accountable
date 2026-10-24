// Small hooks for always-on displays: polling, element size, idle detection,
// a ticking clock, and keeping the screen awake.

import { useEffect, useRef, useState } from "react"

/** How often billboard data is refetched. */
const REFRESH_MS = 5 * 60_000

export interface Live<T> {
    data: T | null
    error: string | null
    /** Ms epoch of the last successful load. */
    updatedAt: number | null
}

/**
 * Load [load] now and every [intervalMs] after, restarting when [key] changes.
 * A failed refresh keeps the last good data on screen and only sets `error`.
 */
export function useLive<T>(
    key: string,
    load: () => Promise<T>,
    intervalMs = REFRESH_MS
): Live<T> {
    const loadRef = useRef(load)
    useEffect(() => {
        loadRef.current = load
    })

    const [state, setState] = useState<Live<T>>({
        data: null,
        error: null,
        updatedAt: null
    })

    useEffect(() => {
        let cancelled = false
        const run = () =>
            loadRef.current().then(
                (data) => {
                    if (!cancelled)
                        setState({ data, error: null, updatedAt: Date.now() })
                },
                (err: unknown) => {
                    if (!cancelled)
                        setState((s) => ({
                            ...s,
                            error:
                                err instanceof Error
                                    ? err.message
                                    : "Failed to load"
                        }))
                }
            )
        void run()
        const timer = setInterval(run, intervalMs)
        return () => {
            cancelled = true
            clearInterval(timer)
        }
    }, [key, intervalMs])

    return state
}

/** Track an element's content-box size. */
export function useElementSize<T extends HTMLElement>() {
    const ref = useRef<T>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect
            setSize({ width, height })
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return [ref, size] as const
}

/** True once the pointer and keyboard have been still for [ms]. */
export function useIdle(ms = 3000): boolean {
    const [idle, setIdle] = useState(false)

    useEffect(() => {
        let timer = setTimeout(() => setIdle(true), ms)
        const wake = () => {
            setIdle(false)
            clearTimeout(timer)
            timer = setTimeout(() => setIdle(true), ms)
        }
        const events = ["mousemove", "mousedown", "keydown", "touchstart"]
        events.forEach((e) => window.addEventListener(e, wake))
        return () => {
            clearTimeout(timer)
            events.forEach((e) => window.removeEventListener(e, wake))
        }
    }, [ms])

    return idle
}

/** The current time, re-rendered every [ms]. */
export function useNow(ms = 15_000): number {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), ms)
        return () => clearInterval(timer)
    }, [ms])
    return now
}

/**
 * Hold a screen wake lock while mounted so a TV or tablet doesn't sleep. The
 * browser drops the lock whenever the tab is hidden, so it's re-acquired on
 * return. Unsupported browsers just ignore it.
 */
export function useWakeLock() {
    useEffect(() => {
        let lock: WakeLockSentinel | null = null
        let released = false

        const acquire = async () => {
            if (document.visibilityState !== "visible") return
            try {
                lock = (await navigator.wakeLock?.request("screen")) ?? null
                if (released) void lock?.release()
            } catch {
                // Denied (e.g. low battery) — the display just sleeps as usual.
            }
        }

        void acquire()
        document.addEventListener("visibilitychange", acquire)
        return () => {
            released = true
            document.removeEventListener("visibilitychange", acquire)
            void lock?.release()
        }
    }, [])
}

/** Whether the document is in fullscreen, plus a toggle. */
export function useFullscreen() {
    const [active, setActive] = useState(() => !!document.fullscreenElement)

    useEffect(() => {
        const sync = () => setActive(!!document.fullscreenElement)
        document.addEventListener("fullscreenchange", sync)
        return () => document.removeEventListener("fullscreenchange", sync)
    }, [])

    const toggle = () => {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void document.documentElement.requestFullscreen?.()
    }

    return [active, toggle] as const
}
