// The dark scoreboard card — both fighters, the lead, and the stakes strip.

import { STAKES } from "../data"
import { CompFighter } from "./CompFighter"

export function Scoreboard() {
    return (
        <div className="card relative mb-[18px] overflow-hidden border-none bg-ink px-10 py-9 text-bg">
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
                    backgroundSize: "100% 32px"
                }}
            />

            <div className="relative flex items-center gap-10">
                <CompFighter
                    side="left"
                    name="Lukas"
                    glyph="L"
                    color="var(--lime)"
                    dark={false}
                    score={14}
                    streak="6d"
                    vals="4.7"
                    big
                    won
                    marker="@lukas-k"
                />
                <div className="flex flex-col items-center gap-1.5">
                    <div className="font-mono text-[11px] tracking-[0.1em] opacity-50">
                        VS
                    </div>
                    <div className="mono text-[38px] font-bold leading-none tracking-[-0.04em] text-lime">
                        +3
                    </div>
                    <div className="text-[11px] opacity-60">your lead</div>
                </div>
                <CompFighter
                    side="right"
                    name="Marcus"
                    glyph="M"
                    color="var(--coral)"
                    dark
                    score={11}
                    streak="14d"
                    vals="3.7"
                    marker="@marcusf"
                />
            </div>

            <div className="relative mt-8 grid grid-cols-4 gap-6 border-t border-white/10 pt-[22px]">
                {STAKES.map((x, i) => (
                    <div key={i}>
                        <div className="mb-1.5 font-mono text-[10px] tracking-[0.1em] text-lime">
                            {x.l}
                        </div>
                        <div className="mb-0.5 text-base font-semibold">
                            {x.v}
                        </div>
                        <div className="text-[11px] opacity-50">{x.sub}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}
