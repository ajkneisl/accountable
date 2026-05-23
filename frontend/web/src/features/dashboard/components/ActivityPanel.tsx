// Right-hand panel — live activity feed, up-next, and a friend nudge.

import { ACTIVITY } from "../data"
import { ActivityRow } from "./ActivityRow"

export function ActivityPanel() {
    return (
        <aside className="w-[320px] border-l border-line-2 bg-bg px-6 py-7">
            <div className="mb-[18px] flex items-center justify-between">
                <div className="eyebrow">ACTIVITY · LIVE</div>
                <span className="h-2 w-2 rounded-full bg-lime" />
            </div>

            <div className="flex flex-col">
                {ACTIVITY.map((a, i) => (
                    <ActivityRow key={i} a={a} />
                ))}
            </div>

            <div className="mt-7 rounded-[14px] bg-bg-sunken p-[18px]">
                <div className="eyebrow mb-2">UP NEXT</div>
                <div className="mb-1 text-sm font-semibold">
                    Solve 2 more LeetCode
                </div>
                <div className="mb-3 text-xs text-ink-3">
                    To stay on today&#39;s plan. ~24 min based on your average.
                </div>
                <button className="btn btn-primary btn-sm w-full">
                    Open LeetCode →
                </button>
            </div>

            <div className="mt-[18px] rounded-[14px] border border-dashed border-line p-[18px]">
                <div className="mb-2 flex items-center gap-2">
                    <div className="grid h-6 w-6 place-items-center rounded-full bg-coral text-[11px] font-semibold text-white">
                        M
                    </div>
                    <div className="text-[13px] font-semibold">
                        Marcus nudged you
                    </div>
                </div>
                <div className="mb-3 text-[13px] text-ink-2">
                    “two leetcodes is like 20 minutes lol”
                </div>
                <div className="flex gap-1.5">
                    <button className="btn btn-line btn-sm flex-1 px-2.5 py-1.5">
                        👍 ok ok
                    </button>
                    <button className="btn btn-line btn-sm flex-1 px-2.5 py-1.5">
                        Reply
                    </button>
                </div>
            </div>
        </aside>
    )
}
