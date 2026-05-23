// A single line in the live activity feed.

import type { Activity } from "../types"

export function ActivityRow({ a }: { a: Activity }) {
    return (
        <div className="flex items-center gap-3 border-t border-line-2 py-2.5">
            <div
                className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                style={{
                    background: a.userColor,
                    color: a.userDark ? "#fff" : "var(--ink)"
                }}
            >
                {a.user[0]}
            </div>
            <div className="flex-1 text-[13px]">
                <b>{a.user}</b>{" "}
                <span className="text-ink-2">{a.action}</span>{" "}
                <span className="text-ink-3">{a.detail}</span>
            </div>
            <div className="mono text-[11px] text-ink-3">{a.time}</div>
        </div>
    )
}
