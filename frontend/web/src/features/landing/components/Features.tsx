import type { ReactNode } from "react"
import { IntegrationIcon } from "../../billboard/components/IntegrationIcon"
import { FeedPreview } from "./FeedPreview"
import { HabitsPreview, StandingsPreview } from "./Previews"

/** One half words, one half picture. [flip] puts the picture on the left on wide screens. */
function Showcase({
    title,
    children,
    picture,
    flip = false
}: {
    title: string
    children: ReactNode
    picture: ReactNode
    flip?: boolean
}) {
    return (
        <section className="px-6 py-14 md:px-16 md:py-24">
            <div className="mx-auto grid max-w-[1040px] items-center gap-10 md:grid-cols-2 md:gap-16">
                <div className={flip ? "md:order-2" : ""}>
                    <h2 className="display m-0 mb-4 text-[34px] leading-[1.08] md:text-[44px]">
                        {title}
                    </h2>
                    <div className="text-[17px] leading-[1.55] text-ink-2">
                        {children}
                    </div>
                </div>
                <div className={flip ? "md:order-1" : ""}>{picture}</div>
            </div>
        </section>
    )
}

const SOURCES = [
    { name: "github", label: "GitHub", goal: "Make 5 commits a week" },
    {
        name: "leetcode",
        label: "LeetCode",
        goal: "Solve 3 medium problems a week"
    },
    {
        name: "apple_fitness",
        label: "Workouts",
        goal: "Work out 4 times a week"
    },
    { name: "apple_steps", label: "Steps", goal: "Walk 10,000 steps a day" },
    { name: "apple_sleep", label: "Sleep", goal: "Sleep 7 hours a night" },
    {
        name: "screen_time",
        label: "Screen Time",
        goal: "Stay under 3 hours a day"
    }
]

/** Every source a goal can track, each with an example of one. */
function Sources() {
    return (
        <section className="border-y border-line-2 bg-bg-sunken px-6 py-14 md:px-16 md:py-24">
            <div className="mx-auto max-w-[1040px]">
                <h2 className="display m-0 mb-4 text-center text-[34px] leading-[1.08] md:text-[44px]">
                    Nothing to log. Just do the thing.
                </h2>
                <p className="mx-auto mb-10 mt-0 max-w-[560px] text-center text-[17px] leading-[1.55] text-ink-2">
                    Connect the apps you already use, and your progress fills
                    itself in. Set goals by the day or by the week.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {SOURCES.map((s) => (
                        <div
                            key={s.name}
                            className="flex items-center gap-3.5 rounded-2xl border border-line-2 bg-bg-card p-4"
                        >
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bg-sunken text-ink">
                                <IntegrationIcon name={s.name} />
                            </span>
                            <div className="min-w-0">
                                <div className="text-[15px] font-semibold">
                                    {s.label}
                                </div>
                                <div className="text-[13px] text-ink-3">
                                    {s.goal}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

/**
 * What Beacc does: the feed, competitions, tracking and habits.
 */
export function Features() {
    return (
        <>
            <Showcase
                title="See it when your friends get it done."
                picture={<FeedPreview />}
            >
                Every run, commit and goal hit shows up for the people you're
                competing with. Send a heart, or take it as your cue to get
                moving.
            </Showcase>

            <Showcase
                flip
                title="Share a code. Start a rivalry."
                picture={<StandingsPreview />}
            >
                Everyone's measured against the same goals. Standings rank you
                by how many you're on pace for this week, with your streak as
                the tie-breaker, so you always know who's ahead.
            </Showcase>

            <Sources />

            <Showcase
                title="For everything an app can't see."
                picture={<HabitsPreview />}
            >
                Reading, meditating, stretching. Tap to mark today done, and
                Beacc keeps a heatmap of every day you showed up. Your habits
                stay private to you.
            </Showcase>
        </>
    )
}
