// Shared layout for onboarding steps 1–4: header + progress, split body, footer.

import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { AccLogo } from "../../common/primitives"
import { TOTAL } from "../constants"

export function OnbShell({
    step,
    title,
    kicker,
    children,
    footer,
    side,
    onBack
}: {
    step: number
    title: ReactNode
    kicker?: string
    children: ReactNode
    footer: ReactNode
    side: ReactNode
    onBack?: () => void
}) {
    return (
        <div className="acc mx-auto flex min-h-[900px] w-[1440px] flex-col bg-bg">
            <header className="flex items-center justify-between px-9 py-6">
                <AccLogo />
                <div className="flex items-center gap-3.5">
                    <span className="mono text-[11px] tracking-[0.1em] text-ink-3">
                        STEP {String(step).padStart(2, "0")} /{" "}
                        {String(TOTAL).padStart(2, "0")}
                    </span>
                    <div className="flex gap-1">
                        {Array.from({ length: TOTAL }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 w-6 rounded-[2px] ${i < step ? "bg-ink" : "bg-line"}`}
                            />
                        ))}
                    </div>
                    <Link
                        to="/"
                        className="ml-2 text-[13px] text-ink-3 no-underline"
                    >
                        Save &amp; quit
                    </Link>
                </div>
            </header>

            <div className="grid flex-1 grid-cols-2 items-stretch pt-5">
                <div className="flex flex-col justify-center py-10 pl-[88px] pr-9">
                    {kicker && <div className="eyebrow mb-3.5">{kicker}</div>}
                    <h1 className="display mb-5 mt-0 max-w-[560px] text-[56px]">
                        {title}
                    </h1>
                    {children}
                </div>
                <div className="flex items-center justify-center py-10 pl-9 pr-[88px]">
                    {side}
                </div>
            </div>

            <footer className="flex items-center justify-between px-9 pb-9 pt-5">
                {onBack ? (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={onBack}
                    >
                        ← Back
                    </button>
                ) : (
                    <div />
                )}
                {footer}
            </footer>
        </div>
    )
}
