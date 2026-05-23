// Onboarding step 01 — account creation.

import { Link } from "react-router-dom"
import { OnbShell } from "./OnbShell"

const labelClass = "block text-xs font-medium text-ink-2 mb-1.5"
const inputClass =
    "w-full border border-line rounded-[10px] px-3.5 py-[11px] text-sm outline-0 mb-3.5 font-[inherit]"

export function StepSignup({ next }: { next: () => void }) {
    const side = (
        <div className="card w-[420px] p-8">
            <div className="mb-[22px] flex flex-col gap-2.5">
                <button className="btn btn-line justify-start px-4 py-3">
                    <span className="inline-grid h-[18px] w-[18px] place-items-center rounded bg-ink text-[11px] font-bold text-bg">

                    </span>
                    Continue with Apple
                </button>
                <button className="btn btn-line justify-start px-4 py-3">
                    <span
                        className="h-[18px] w-[18px] rounded-full"
                        style={{
                            background:
                                "conic-gradient(from 0deg, #ea4335, #fbbc04, #34a853, #4285f4, #ea4335)"
                        }}
                    />
                    Continue with Google
                </button>
                <button className="btn btn-line justify-start px-4 py-3">
                    <span className="inline-grid h-[18px] w-[18px] place-items-center rounded bg-ink font-mono text-[10px] font-bold text-bg">
                        GH
                    </span>
                    Continue with GitHub
                </button>
            </div>

            <div className="mb-[18px] flex items-center gap-3">
                <hr className="divider flex-1" />
                <span className="mono text-[11px] text-ink-3">OR EMAIL</span>
                <hr className="divider flex-1" />
            </div>

            <label className={labelClass}>Your name</label>
            <input defaultValue="Lukas Kroon" className={inputClass} />

            <label className={labelClass}>Email</label>
            <input defaultValue="lukas@kroon.work" className={inputClass} />

            <label className={labelClass}>Pick a username</label>
            <div className="mb-1.5 flex items-center rounded-[10px] border border-line px-3.5 py-[11px]">
                <span className="mr-0.5 text-sm text-ink-3">
                    accountable.so/
                </span>
                <input
                    defaultValue="lukas-k"
                    className="flex-1 border-0 bg-transparent text-sm font-semibold font-[inherit] text-ink outline-0"
                />
                <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-lime text-[11px] font-bold text-ink">
                    ✓
                </span>
            </div>
            <div className="mono text-[11px] text-ink-3">
                available · friends find you here
            </div>
        </div>
    )

    return (
        <OnbShell
            step={1}
            kicker="01 · CREATE YOUR ACCOUNT"
            title={
                <>
                    Goals stick when
                    <br />
                    someone&apos;s watching.
                </>
            }
            side={side}
            footer={
                <div className="flex items-center gap-4">
                    <span className="text-[13px] text-ink-3">
                        Already have one?{" "}
                        <Link to="/login" className="text-ink">
                            Sign in
                        </Link>
                    </span>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={next}
                    >
                        Continue →
                    </button>
                </div>
            }
        >
            <p className="mb-7 max-w-[480px] text-[17px] leading-[1.5] text-ink-2">
                We&apos;ll set you up with one goal, one source, and one friend.
                That&apos;s the whole onboarding. Should take about 90 seconds.
            </p>
            <div className="grid max-w-[460px] grid-cols-2 gap-3.5">
                {[
                    { n: "90s", l: "avg setup" },
                    { n: "4,210", l: "on track this week" },
                    { n: "32", l: "data sources" },
                    { n: "free", l: "first 3 friends" }
                ].map((s, i) => (
                    <div
                        key={i}
                        className="border-l-2 border-ink bg-bg-card px-3.5 py-3"
                    >
                        <div className="mono text-[22px] font-bold tracking-[-0.02em]">
                            {s.n}
                        </div>
                        <div className="text-xs text-ink-3">{s.l}</div>
                    </div>
                ))}
            </div>
        </OnbShell>
    )
}
