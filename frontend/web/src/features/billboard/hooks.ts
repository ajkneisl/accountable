// Small hooks for always-on displays: polling, element size, idle detection,
// a ticking clock, keeping the screen awake, which chrome a link hides, and
// the light or dark theme.

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { isDisplaySession } from "../../auth"

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

/** A part of a widget's chrome that can be hidden: the title row, or the clock. */
export type Chrome = "header" | "time"

/** URL parameter listing hidden chrome: `?hide=header&hide=time`. */
const HIDE_PARAM = "hide"

/**
 * Which chrome the URL hides, plus a toggle. It lives in the query string, not
 * storage, so it travels with a copied display link — the only state a kiosk has.
 */
export function useHiddenChrome() {
    const location = useLocation()
    const navigate = useNavigate()

    // Comma lists are accepted too, for links typed by hand: `?hide=header,time`.
    const hidden = new Set(
        new URLSearchParams(location.search)
            .getAll(HIDE_PARAM)
            .flatMap((value) => value.split(","))
    )

    const toggle = (part: Chrome) => {
        const next = new Set(hidden)
        if (!next.delete(part)) next.add(part)
        const params = new URLSearchParams(location.search)
        params.delete(HIDE_PARAM)
        next.forEach((value) => params.append(HIDE_PARAM, value))
        // Keep the fragment: on a display it carries the link's token.
        navigate(
            { search: params.toString(), hash: location.hash },
            { replace: true }
        )
    }

    return [hidden, toggle] as const
}

/** How the billboard picks its theme: always one, or by the time of day. */
export type ThemeMode = "light" | "dark" | "auto"

export const THEME_MODES: ThemeMode[] = ["light", "dark", "auto"]

/** URL parameter naming the theme: `?theme=dark`. */
const THEME_PARAM = "theme"

/** Where a signed-in browser remembers its choice between pages. */
const THEME_STORAGE_KEY = "beacc_billboard_theme"

/**
 * In `auto`, the local hours (24h) the billboard is light: from 7 in the
 * morning up to 7 in the evening. Outside them it's dark.
 */
export const AUTO_LIGHT_FROM = 7
export const AUTO_LIGHT_UNTIL = 19

function parseTheme(value: string | null): ThemeMode | null {
    return THEME_MODES.find((mode) => mode === value) ?? null
}

/** The browser's remembered theme, or null: never set, or storage is off. */
function storedTheme(): ThemeMode | null {
    try {
        return parseTheme(localStorage.getItem(THEME_STORAGE_KEY))
    } catch {
        return null
    }
}

/**
 * [search] with this browser's theme added, unless it already names one or the
 * theme is the default. For a copied display link: a kiosk has no storage to
 * remember a choice in, only its URL.
 */
export function withTheme(search: string): string {
    const params = new URLSearchParams(search)
    const stored = storedTheme()
    if (!params.has(THEME_PARAM) && stored !== null && stored !== "light")
        params.set(THEME_PARAM, stored)
    const query = params.toString()
    return query ? `?${query}` : ""
}

/**
 * The billboard's theme, applied to the page while the caller is mounted.
 *
 * The mode comes from the URL (`?theme=`), which is all a display has; failing
 * that, from what this browser last chose; failing that, light. `auto` is dark
 * outside {@link AUTO_LIGHT_FROM}–{@link AUTO_LIGHT_UNTIL} and is rechecked
 * every minute, so a display left up turns over by itself.
 */
export function useBillboardTheme() {
    const location = useLocation()
    const navigate = useNavigate()
    const [stored, setStored] = useState(storedTheme)
    const fromUrl = parseTheme(
        new URLSearchParams(location.search).get(THEME_PARAM)
    )
    const mode: ThemeMode = fromUrl ?? stored ?? "light"

    const hour = new Date(useNow(60_000)).getHours()
    const dark =
        mode === "dark" ||
        (mode === "auto" &&
            (hour < AUTO_LIGHT_FROM || hour >= AUTO_LIGHT_UNTIL))

    // Before paint, so a dark billboard never flashes light first. The theme
    // is the page's, set on <html>; leaving the billboard hands it back.
    useLayoutEffect(() => {
        const root = document.documentElement
        if (dark) root.dataset.theme = "dark"
        else delete root.dataset.theme
        return () => {
            delete root.dataset.theme
        }
    }, [dark])

    const setMode = (next: ThemeMode) => {
        // A display runs off its link alone, without storage.
        if (!isDisplaySession) {
            try {
                localStorage.setItem(THEME_STORAGE_KEY, next)
            } catch {
                // No storage: the choice lasts until the page is left.
            }
        }
        setStored(next)
        // The URL wins over storage, so one that names a theme has to follow.
        if (fromUrl !== null || isDisplaySession) {
            const params = new URLSearchParams(location.search)
            params.set(THEME_PARAM, next)
            // Keep the fragment: on a display it carries the link's token.
            navigate(
                { search: params.toString(), hash: location.hash },
                { replace: true }
            )
        }
    }

    return { mode, dark, setMode }
}

export type BillboardTheme = ReturnType<typeof useBillboardTheme>

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
