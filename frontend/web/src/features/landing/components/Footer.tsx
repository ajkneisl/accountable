// Landing footer.

import { AccLogo } from "../../common/primitives"

export function Footer() {
    return (
        <footer className="flex items-end justify-between border-t border-line-2 px-16 pb-14 pt-10 text-[13px] text-ink-3">
            <div>
                <AccLogo />
                <div className="mt-3">
                    © 2026 · Built by two friends who kept missing the gym.
                </div>
            </div>
            <div className="flex gap-10">
                <div>
                    <div className="eyebrow mb-2.5">Product</div>
                    <div className="flex flex-col gap-1.5">
                        {["Sources", "Competitions", "Squads"].map((l) => (
                            <a
                                key={l}
                                className="cursor-pointer text-inherit no-underline"
                            >
                                {l}
                            </a>
                        ))}
                    </div>
                </div>
                <div>
                    <div className="eyebrow mb-2.5">Company</div>
                    <div className="flex flex-col gap-1.5">
                        {["About", "Manifesto", "Privacy"].map((l) => (
                            <a
                                key={l}
                                className="cursor-pointer text-inherit no-underline"
                            >
                                {l}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}
