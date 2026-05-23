// Summary card — the live head-to-head competition.

import { Link } from "react-router-dom"

export function CompetitionCard() {
    return (
        <div className="card border-none bg-ink p-6 text-bg">
            <div className="mb-3.5 flex items-center justify-between">
                <div className="eyebrow text-lime">LIVE COMPETITION</div>
                <span className="chip bg-white/10 text-bg">4d left</span>
            </div>
            <div className="mb-3.5 flex items-center gap-[18px]">
                <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-lime font-bold text-ink">
                        L
                    </div>
                    <div className="mono text-4xl font-bold tracking-[-0.03em]">
                        14
                    </div>
                </div>
                <div className="opacity-40">vs</div>
                <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-coral font-bold text-white">
                        M
                    </div>
                    <div className="mono text-4xl font-bold tracking-[-0.03em] opacity-60">
                        11
                    </div>
                </div>
            </div>
            <div className="mb-3.5 text-[13px] opacity-70">
                You vs Marcus · week 19. Loser buys coffee for a week.
            </div>
            <Link to="/competition" className="btn btn-accent btn-sm w-full">
                Open competition →
            </Link>
        </div>
    )
}
