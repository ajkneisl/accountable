// Landing hero — headline, CTAs, and the phone preview.

import { Link } from "react-router-dom"
import { HeroPreview } from "./HeroPreview"

export function Hero() {
    return (
        <section
            className="grid items-center gap-[60px] px-16 pb-20 pt-10"
            style={{ gridTemplateColumns: "1.05fr 1fr" }}
        >
            <div>
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-line-2 bg-bg-card py-1.5 pl-1.5 pr-3">
                    <span className="chip bg-lime px-2 py-[3px] text-ink">
                        NEW
                    </span>
                    <span className="text-[13px] text-ink-2">
                        Group bets &amp; head-to-head weeks
                    </span>
                    <span className="text-sm text-ink-3">›</span>
                </div>
                <h1 className="display mb-6 mt-0 text-[92px]">
                    Goals get done
                    <br />
                    when friends are
                    <br />
                    <span
                        className="rounded-xl bg-lime px-3"
                        style={{
                            WebkitBoxDecorationBreak: "clone",
                            boxDecorationBreak: "clone"
                        }}
                    >
                        watching.
                    </span>
                </h1>
                <p className="mb-8 mt-0 max-w-[520px] text-[19px] leading-[1.5] text-ink-2">
                    Accountable plugs into the tools you already use — GitHub,
                    LeetCode, Apple Health, Screen Time — and keeps you and your
                    friends honest about the goals you set together.
                </p>

                <div className="mb-7 flex items-center gap-3">
                    <Link to="/onboarding" className="btn btn-primary btn-lg">
                        Start a goal — free
                    </Link>
                    <Link to="/dashboard" className="btn btn-line btn-lg">
                        See a live dashboard →
                    </Link>
                </div>

                <div className="flex items-center gap-3.5 text-[13px] text-ink-3">
                    <div className="flex">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-7 w-7 rounded-full border-2 border-bg"
                                style={{
                                    background: [
                                        "var(--coral)",
                                        "var(--lime)",
                                        "var(--ink)",
                                        "var(--bg-sunken)"
                                    ][i],
                                    marginLeft: i ? -8 : 0
                                }}
                            />
                        ))}
                    </div>
                    <span>
                        <b className="text-ink-2">4,210 people</b> stayed on
                        their goals this week.
                    </span>
                </div>
            </div>

            <div className="flex justify-center pr-6">
                <HeroPreview />
            </div>
        </section>
    )
}
