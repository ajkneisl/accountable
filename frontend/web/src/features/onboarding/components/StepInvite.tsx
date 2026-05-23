// Onboarding step 04 — invite friends to watch the goal.

import { OnbShell } from "./OnbShell"

export function StepInvite({
    next,
    back
}: {
    next: () => void
    back: () => void
}) {
    const suggested = [
        { l: "M", n: "Marcus Frost", u: "@marcusf", why: "You both have GitHub linked", c: "var(--coral)", dark: true, added: true },
        { l: "J", n: "Jess Park", u: "@jess", why: "In your contacts", c: "var(--lime)", added: true },
        { l: "S", n: "Sam Okafor", u: "@samok", why: "Already on Accountable", c: "var(--ink)", dark: true },
        { l: "P", n: "Priya R.", u: "@priya.r", why: "In your contacts", c: "var(--coral)", dark: true }
    ]

    const side = (
        <div className="w-[440px]">
            <div className="eyebrow mb-3">
                PREVIEW · WHAT THEY&apos;LL SEE
            </div>
            <div className="card rounded-[18px] border-none bg-ink p-6 text-bg">
                <div className="mb-[18px] flex items-center justify-between">
                    <div>
                        <div className="text-lg font-bold tracking-[-0.01em]">
                            Ship code · 5/wk
                        </div>
                        <div className="text-xs opacity-60">
                            Lukas&apos;s goal · Mon → Sun
                        </div>
                    </div>
                    <span className="chip bg-white/10 text-bg">
                        3 watching
                    </span>
                </div>
                <div className="flex flex-col gap-2">
                    {[
                        { n: "You (Lukas)", s: "3 / 5", mine: true },
                        { n: "Marcus Frost", s: "— invited", pending: true },
                        { n: "Jess Park", s: "— invited", pending: true }
                    ].map((r, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${r.mine ? "bg-[rgba(166,217,71,0.14)]" : "bg-white/[0.04]"}`}
                        >
                            <div
                                className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold"
                                style={{
                                    background: [
                                        "var(--lime)",
                                        "var(--coral)",
                                        "var(--lime)"
                                    ][i],
                                    color: i === 1 ? "#fff" : "var(--ink)"
                                }}
                            >
                                {r.n[0] === "Y" ? "L" : r.n[0]}
                            </div>
                            <div className="flex-1 text-[13px] font-medium">
                                {r.n}
                            </div>
                            <div
                                className={`mono text-xs ${r.pending ? "opacity-50" : ""} ${r.mine ? "text-lime" : ""}`}
                            >
                                {r.s}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-[18px] border-t border-white/10 pt-3.5 text-xs leading-[1.5] opacity-60">
                    They get a once-daily digest. No pings. They cheer or jeer.
                    Sunday we tally.
                </div>
            </div>
        </div>
    )

    return (
        <OnbShell
            step={4}
            kicker="04 · BRING SOMEONE IN"
            title={
                <>
                    A goal alone is a wish.
                    <br />
                    A goal shared is a deal.
                </>
            }
            side={side}
            onBack={back}
            footer={
                <div className="flex items-center gap-3.5">
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={next}
                    >
                        Skip — I&apos;ll add later
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={next}
                    >
                        Send 2 invites →
                    </button>
                </div>
            }
        >
            <p className="mb-5 max-w-[480px] text-base text-ink-2">
                One person makes a difference. Two makes a habit. Pick at least
                one from below — or paste a phone, email, or @username.
            </p>

            <div className="mb-[18px] flex max-w-[480px] items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-line bg-bg-card px-3.5 py-2.5">
                    <span className="text-ink-3">＠</span>
                    <input
                        defaultValue="marcus@"
                        className="flex-1 border-0 bg-transparent text-sm font-[inherit] outline-0"
                    />
                </div>
                <button className="btn btn-line btn-sm">+ Add</button>
            </div>

            <div className="eyebrow mb-2.5">
                SUGGESTED · BASED ON YOUR ACCOUNT
            </div>
            <div className="flex max-w-[480px] flex-col gap-1.5">
                {suggested.map((p, i) => (
                    <div
                        key={i}
                        className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${p.added ? "bg-bg-sunken" : "bg-transparent"}`}
                    >
                        <div
                            className="grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold"
                            style={{
                                background: p.c,
                                color: p.dark ? "#fff" : "var(--ink)"
                            }}
                        >
                            {p.l}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">{p.n}</div>
                            <div className="text-[11px] text-ink-3">
                                {p.u} · {p.why}
                            </div>
                        </div>
                        {p.added ? (
                            <span className="chip bg-lime text-ink">
                                ✓ added
                            </span>
                        ) : (
                            <button className="btn btn-line btn-sm">
                                Add
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </OnbShell>
    )
}
