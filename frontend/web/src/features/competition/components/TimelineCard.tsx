// Card listing today's competition event timeline.

import { FEED } from "../data"
import { HourBar } from "./HourBar"

export function TimelineCard() {
    return (
        <div className="card p-[22px]">
            <div className="mb-3.5 flex items-center justify-between">
                <div className="eyebrow">TIMELINE · TODAY</div>
                <span className="chip">
                    <span className="dot-ink" /> Wed · 6 events
                </span>
            </div>
            <div className="flex flex-col gap-2">
                {FEED.map((e, i) => (
                    <HourBar key={i} event={e} />
                ))}
            </div>
        </div>
    )
}
