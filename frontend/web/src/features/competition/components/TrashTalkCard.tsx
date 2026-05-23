// Card with the trash-talk chat thread and a composer.

import { TRASH } from "../data"

export function TrashTalkCard() {
    return (
        <div className="card flex flex-col p-[22px]">
            <div className="mb-3.5 flex items-center justify-between">
                <div className="eyebrow">TRASH TALK</div>
                <span className="text-[11px] text-ink-3">
                    Jess joined as judge
                </span>
            </div>
            <div className="flex flex-1 flex-col gap-2.5">
                {TRASH.map((m, i) => (
                    <div
                        key={i}
                        className={`flex items-end gap-2 ${m.mine ? "flex-row-reverse" : "flex-row"}`}
                    >
                        <div
                            className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                            style={{
                                background: m.color,
                                color: m.dark ? "#fff" : "var(--ink)"
                            }}
                        >
                            {m.who}
                        </div>
                        <div
                            className={`max-w-[260px] rounded-[14px] px-3 py-2 text-[13px] leading-[1.4] ${m.mine ? "bg-ink text-bg" : "bg-bg-sunken text-ink"}`}
                        >
                            {!m.mine && (
                                <div className="mb-0.5 text-[11px] text-ink-3">
                                    {m.name}
                                </div>
                            )}
                            {m.body}
                        </div>
                        <div className="mono self-end text-[10px] text-ink-3">
                            {m.time}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-3.5 flex gap-1.5 border-t border-line-2 pt-3.5">
                <input
                    placeholder="say something regrettable…"
                    className="flex-1 rounded-full border border-line px-3.5 py-2 text-[13px] font-[inherit] outline-0"
                />
                <button className="btn btn-primary btn-sm">Send</button>
            </div>
        </div>
    )
}
