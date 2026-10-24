// The billboard overview: a read-only look at the signed-in user's goals, habits
// and competitions, with a link to open each as a full-screen widget.

import type { ReactNode } from "react"
import { useAtomValue } from "jotai"
import { Link } from "react-router-dom"
import { listHabits, useApi } from "@shared/index"
import { useSignOut, userAtom } from "../../auth"
import { LogoLink } from "../common/primitives"
import { CompetitionBoard } from "./components/CompetitionBoard"
import { GoalCard } from "./components/GoalCard"
import { HabitCard } from "./components/HabitCard"
import { loadCompetitions, loadGoals } from "./data"
import { goalKey } from "./format"
import { HABIT_DAYS } from "./grid"
import { type Live, useLive } from "./hooks"

function FullScreenLink({ to }: { to: string }) {
    return (
        <Link to={to} className="btn btn-line btn-sm">
            Full screen ↗
        </Link>
    )
}

/** A titled billboard section that handles its own loading, error and empty states. */
function Section<T>({
    title,
    live,
    count,
    empty,
    action,
    children
}: {
    title: string
    live: Live<T>
    count: (data: T) => number
    empty: string
    action?: ReactNode
    children: (data: T) => ReactNode
}) {
    const { data, error } = live
    const n = data === null ? null : count(data)

    let body: ReactNode
    if (data === null)
        body = (
            <p className="m-0 text-ink-3">
                {error ? `Couldn't load: ${error}` : "Loading…"}
            </p>
        )
    else if (n === 0) body = <p className="m-0 text-ink-3">{empty}</p>
    else body = children(data)

    return (
        <section className="mb-14">
            <div className="mb-5 flex items-center gap-3">
                <h2 className="m-0 text-[26px] font-bold tracking-[-0.02em]">
                    {title}
                </h2>
                {n !== null && <span className="chip mono">{n}</span>}
                <div className="ml-auto">{n ? action : null}</div>
            </div>
            {body}
        </section>
    )
}

export default function Billboard() {
    const api = useApi()
    const user = useAtomValue(userAtom)
    const signOut = useSignOut()

    const goals = useLive("goals", () => loadGoals(api))
    const habits = useLive("habits", () => listHabits(api, HABIT_DAYS))
    const competitions = useLive("competitions", () => loadCompetitions(api))

    return (
        <div className="acc mx-auto w-full max-w-[1440px] flex-1 px-6 pb-10 text-[14px] md:px-16">
            <header className="flex items-center justify-between py-6">
                <LogoLink />
                <div className="flex items-center gap-3 text-[13px]">
                    <span className="text-ink-3">{user?.username}</span>
                    <button
                        type="button"
                        onClick={signOut}
                        className="btn btn-line btn-sm"
                    >
                        Sign out
                    </button>
                </div>
            </header>

            <div className="pb-12 pt-8">
                <h1 className="display m-0 max-w-[820px] text-[48px] leading-[1.05]">
                    Everything you&apos;re working on, at a glance.
                </h1>
                <p className="mb-0 mt-4 max-w-[620px] text-[16px] leading-[1.5] text-ink-2">
                    View-only, tracking any goals or habits must be done within the app.
                </p>
            </div>

            <Section
                title="Goals"
                live={goals}
                count={(g) => g.length}
                empty="No goals yet."
                action={<FullScreenLink to="/billboard/goals" />}
            >
                {(data) => (
                    <div className="grid grid-cols-1 gap-[1.1em] sm:grid-cols-2 xl:grid-cols-3">
                        {data.map((goal) => (
                            <GoalCard key={goalKey(goal)} goal={goal} />
                        ))}
                    </div>
                )}
            </Section>

            <Section
                title="Habits"
                live={habits}
                count={(h) => h.habits.length}
                empty="No habits yet."
                action={<FullScreenLink to="/billboard/habits" />}
            >
                {(data) => (
                    <div className="grid grid-cols-1 gap-[1.1em] lg:grid-cols-2">
                        {data.habits.map((habit) => (
                            <HabitCard
                                key={habit.id}
                                habit={habit}
                                start={data.start}
                                today={data.today}
                            />
                        ))}
                    </div>
                )}
            </Section>

            <Section
                title="Competitions"
                live={competitions}
                count={(c) => c.length}
                empty="You're not in any competitions yet."
            >
                {(data) => (
                    <div className="flex flex-col gap-10">
                        {data.map((c) => (
                            <div key={c.detail.id}>
                                <div className="mb-3 flex items-center gap-3">
                                    <h3 className="m-0 text-[18px] font-semibold tracking-[-0.01em]">
                                        {c.detail.name}
                                    </h3>
                                    <span className="text-[13px] text-ink-3">
                                        {c.detail.members.length}{" "}
                                        {c.detail.members.length === 1
                                            ? "member"
                                            : "members"}
                                    </span>
                                    <div className="ml-auto">
                                        <FullScreenLink
                                            to={`/billboard/competitions/${c.detail.id}`}
                                        />
                                    </div>
                                </div>
                                <CompetitionBoard
                                    competition={c}
                                    meID={user?.userID}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </Section>
        </div>
    )
}
