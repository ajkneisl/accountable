// One event in today's competition timeline.

import type { FeedEvent } from "../types"

export function HourBar({ event }: { event: FeedEvent }) {
    const isYou = event.who === "you"
    return (
        <div
            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${isYou ? "bg-lime-soft" : "bg-coral-soft"}`}
        >
            <div className="mono w-[46px] text-[11px] text-ink-3">
                {event.time}
            </div>
            <div
                className={`w-1 self-stretch rounded-[2px] ${isYou ? "bg-lime" : "bg-coral"}`}
            />
            <div className="flex-1 text-[13px]">
                <b>{isYou ? "You" : "Marcus"}</b>{" "}
                <span className="text-ink-2">{event.text}</span>
            </div>
            <div
                className={`mono text-xs font-semibold ${isYou ? "text-lime-ink" : "text-coral-ink"}`}
            >
                +{event.pts}
            </div>
        </div>
    )
}
