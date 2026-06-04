import { Link } from "react-router-dom"
import { HeroPreview } from "./HeroPreview"

/**
 * Hero section of Accountable.
 *
 * TODO: This includes a fake number of people using the app, make this real.
 */
export function Hero() {
    return (
        <section
            className="grid items-center gap-[60px] px-16 pb-20 pt-10"
            style={{ gridTemplateColumns: "1.05fr 1fr" }}
        >
            <div>
                <h1 className="display mb-6 mt-0 text-[92px]">
                    Goals get done
                    <div className="h-4" />
                    when friends are
                    <div className="h-4" />
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
                    Accountable integrates into the tools you already have to
                    keep you and your friends honest about your goals. Track
                    GitHub commits, LeetCode problems, and workouts all in one
                    place.
                </p>

                <div className="mb-7 flex items-center gap-3">
                    <Link to="/register" className="btn btn-primary btn-lg">
                        Set your first goal
                    </Link>

                    <Link to="/dashboard" className="btn btn-line btn-lg">
                        Login
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
