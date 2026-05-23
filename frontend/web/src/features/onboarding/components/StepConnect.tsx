// Onboarding step 03 — connect a data source (OAuth-style screen).

import { SourceTile } from "../../common/primitives"
import { OnbShell } from "./OnbShell"

export function StepConnect({
    next,
    back
}: {
    next: () => void
    back: () => void
}) {
    const permissions = [
        { l: "Read public & private repo metadata", sub: "We see commit counts, never code", on: true },
        { l: "Read pull-request events", sub: "For PR-based goals", on: true },
        { l: "Read your profile", sub: "username + avatar", on: true },
        { l: "Write to your account", sub: "Never. We refuse this scope.", off: true }
    ]

    const side = (
        <div className="relative w-[460px]">
            <div
                className="absolute -left-[18px] -top-[18px] bottom-[18px] right-[18px] rounded-[22px] bg-bg-sunken"
                style={{ transform: "rotate(-2deg)" }}
            />
            <div className="card relative rounded-[22px] p-7 shadow-lg">
                <div className="mb-[22px] flex items-center gap-3.5">
                    <SourceTile label="GH" variant="ink" />
                    <div className="flex-1">
                        <div className="text-[15px] font-semibold">
                            github.com
                        </div>
                        <div className="text-xs text-ink-3">
                            OAuth · accountable-app
                        </div>
                    </div>
                    <span className="chip bg-lime-soft text-lime-ink">
                        <span className="dot-lime" /> secure
                    </span>
                </div>

                <div className="eyebrow mb-3">WE&apos;LL ASK FOR</div>
                <div className="mb-[22px] flex flex-col gap-3">
                    {permissions.map((p, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div
                                className={`mt-px grid h-5 w-5 flex-shrink-0 place-items-center rounded-md text-[13px] font-bold text-ink ${p.off ? "border border-dashed border-ink-3 bg-transparent" : "bg-lime"}`}
                            >
                                {p.off ? "×" : "✓"}
                            </div>
                            <div>
                                <div className="text-[13px] font-semibold">
                                    {p.l}
                                </div>
                                <div className="text-[11px] text-ink-3">
                                    {p.sub}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button className="btn btn-primary w-full">
                    Authorize on github.com →
                </button>
                <div className="mono mt-3 text-center text-[11px] text-ink-3">
                    opens github · revoke any time
                </div>
            </div>
        </div>
    )

    return (
        <OnbShell
            step={3}
            kicker="03 · CONNECT A SOURCE"
            title={
                <>
                    We trust the data,
                    <br />
                    not the promises.
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
                        Skip for now
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={next}
                    >
                        Connect GitHub →
                    </button>
                </div>
            }
        >
            <p className="mb-6 max-w-[480px] text-base text-ink-2">
                Accountable reads from the apps that already track this. No
                self-reporting, no fudging the numbers, no Sunday-night regret
                edits.
            </p>
            <div className="flex max-w-[480px] flex-col gap-2.5">
                {[
                    {
                        l: "Read-only",
                        s: "We can never push, write, or send on your behalf."
                    },
                    {
                        l: "Counts, not contents",
                        s: "GitHub shows us push events. Apple Health shows session totals. We see numbers."
                    },
                    {
                        l: "Revoke any time",
                        s: "One click in Settings disconnects and deletes history."
                    }
                ].map((r, i) => (
                    <div key={i} className="flex gap-3">
                        <div className="grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full bg-bg-sunken text-[11px] font-bold text-ink">
                            {i + 1}
                        </div>
                        <div>
                            <div className="text-sm font-semibold">{r.l}</div>
                            <div className="text-[13px] text-ink-3">{r.s}</div>
                        </div>
                    </div>
                ))}
            </div>
        </OnbShell>
    )
}
