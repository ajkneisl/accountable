// Landing section 04 — head-to-head competition teaser.

import { Link } from "react-router-dom"

export function CompetitionTease() {
    return (
        <section className="px-16 pb-24" id="competitions">
            <div className="card grid grid-cols-2 items-center gap-[60px] rounded-[32px] border-none bg-ink px-16 py-14 text-bg">
                <div>
                    <div className="eyebrow mb-3 text-lime">
                        04 · HEAD-TO-HEAD
                    </div>
                    <h2 className="display mb-5 mt-0 text-[56px]">
                        Bet your friend.
                        <br />
                        Settle it on Sunday.
                    </h2>
                    <p className="mb-7 max-w-[480px] text-[17px] leading-[1.5] opacity-70">
                        Drop a weekly score against one friend, or set a bounty:
                        loser buys coffee, loser writes a postcard, loser owns
                        it in the group chat. Stakes optional. Pride mandatory.
                    </p>
                    <Link to="/competition" className="btn btn-accent btn-lg">
                        Start a competition →
                    </Link>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-7">
                    <div className="mb-6 flex justify-between text-xs">
                        <span className="mono opacity-60">
                            WEEK 19 · WED EVENING
                        </span>
                        <span className="chip bg-white/10 text-bg">
                            <span className="dot-lime" /> live
                        </span>
                    </div>
                    <div className="mb-7 flex items-center justify-between">
                        <div className="text-center">
                            <div className="mx-auto mb-2.5 grid h-16 w-16 place-items-center rounded-full bg-lime text-2xl font-bold text-ink">
                                L
                            </div>
                            <div className="text-[13px] opacity-70">you</div>
                            <div className="mono text-[56px] font-bold leading-none tracking-[-0.04em]">
                                14
                            </div>
                        </div>
                        <div className="text-xl opacity-40">vs</div>
                        <div className="text-center">
                            <div className="mx-auto mb-2.5 grid h-16 w-16 place-items-center rounded-full bg-coral text-2xl font-bold text-white">
                                M
                            </div>
                            <div className="text-[13px] opacity-70">marcus</div>
                            <div className="mono text-[56px] font-bold leading-none tracking-[-0.04em] opacity-60">
                                11
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        {["Commits", "LeetCode", "Workouts", "Screen time"].map(
                            (row, i) => (
                                <div
                                    key={row}
                                    className="flex items-center gap-3 text-xs"
                                >
                                    <span className="w-[84px] opacity-70">
                                        {row}
                                    </span>
                                    <div className="grid flex-1 grid-cols-2 gap-1.5">
                                        <div
                                            className="bar h-1.5"
                                            style={{
                                                background:
                                                    "rgba(255,255,255,0.08)"
                                            }}
                                        >
                                            <i
                                                style={{
                                                    width:
                                                        [80, 40, 100, 60][i] +
                                                        "%",
                                                    background: "var(--lime)"
                                                }}
                                            />
                                        </div>
                                        <div
                                            className="bar h-1.5"
                                            style={{
                                                background:
                                                    "rgba(255,255,255,0.08)"
                                            }}
                                        >
                                            <i
                                                style={{
                                                    width:
                                                        [60, 90, 30, 80][i] +
                                                        "%",
                                                    background: "var(--coral)"
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                    <div className="mt-[22px] flex justify-between border-t border-white/10 pt-[18px] text-xs opacity-70">
                        <span>Stakes · loser buys coffee × 1 week</span>
                        <span className="mono">4 days left</span>
                    </div>
                </div>
            </div>
        </section>
    )
}
