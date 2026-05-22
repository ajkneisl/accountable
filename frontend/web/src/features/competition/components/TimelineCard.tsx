// Card listing today's competition event timeline.

import { FEED } from "../data"
import { HourBar } from "./HourBar"

export function TimelineCard() {
    return (
        <div className="card" style={{ padding: 22 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14
                }}
            >
                <div className="eyebrow">TIMELINE · TODAY</div>
                <span className="chip">
                    <span className="dot-ink" /> Wed · 6 events
                </span>
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                }}
            >
                {FEED.map((e, i) => (
                    <HourBar key={i} event={e} />
                ))}
            </div>
        </div>
    )
}
