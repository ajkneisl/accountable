// Full-screen shell for a billboard widget, built to sit on a TV: fills the
// viewport, scales its type with the screen, shows a clock and when the data
// last refreshed, keeps the screen awake, and hides the cursor and controls
// once the mouse goes still.

import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { formatTime } from "../format"
import {
    type Live,
    useFullscreen,
    useIdle,
    useNow,
    useWakeLock
} from "../hooks"
import { Placeholder } from "./primitives"

export function WidgetFrame<T>({
    title,
    live,
    children
}: {
    title: string | ((data: T) => string)
    live: Live<T>
    children: (data: T) => ReactNode
}) {
    useWakeLock()
    const idle = useIdle()
    const now = useNow()
    const [fullscreen, toggleFullscreen] = useFullscreen()

    const { data, error, updatedAt } = live
    const heading =
        typeof title === "string" ? title : data !== null ? title(data) : ""

    return (
        <div
            className={`acc flex h-screen w-screen flex-col gap-[1.4em] overflow-hidden p-[2em] ${
                idle ? "cursor-none" : ""
            }`}
            // Everything inside is em-sized, so this one value scales the widget.
            style={{ fontSize: "clamp(12px, 1.75vmin, 56px)" }}
        >
            <header className="flex flex-wrap items-center gap-x-[1em] gap-y-[0.6em]">
                <span className="acc-logo text-[1.5em]">
                    <span className="dot" />
                    Beacc
                </span>
                <span className="text-[1.5em] text-line">/</span>
                <h1 className="m-0 min-w-0 truncate text-[1.5em] font-semibold tracking-[-0.02em]">
                    {heading}
                </h1>

                <div
                    className={`ml-auto flex items-center gap-2 transition-opacity duration-500 ${
                        idle ? "pointer-events-none opacity-0" : ""
                    }`}
                >
                    <Link to="/billboard" className="btn btn-line btn-sm">
                        ← Billboard
                    </Link>
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="btn btn-line btn-sm"
                    >
                        {fullscreen ? "Exit full screen" : "Full screen"}
                    </button>
                </div>

                <div className="text-right">
                    <div className="mono text-[1.5em] font-semibold leading-none">
                        {formatTime(now)}
                    </div>
                    <div className="mt-[0.35em] text-[0.8em] text-ink-3">
                        {error
                            ? "Offline · retrying"
                            : updatedAt
                              ? `Updated ${formatTime(updatedAt)}`
                              : "Loading…"}
                    </div>
                </div>
            </header>

            <main className="min-h-0 flex-1">
                {data === null ? (
                    <Placeholder>{error ?? "Loading…"}</Placeholder>
                ) : (
                    children(data)
                )}
            </main>
        </div>
    )
}
