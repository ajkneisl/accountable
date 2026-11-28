// Drawn samples of the app's competition and habits screens. Like FeedPreview,
// they stay crisp at any width and are read as one image by screen readers.

import {
    Avatar,
    COMPETITION,
    CompetitionTile,
    MEMBERS,
    SKY,
    type SampleMember
} from "./samples"

const CARD = "rounded-2xl border border-line-2 bg-bg-card shadow-sm"

const GOALS = 3

const STANDINGS: { member: SampleMember; hits: number; streak: number }[] = [
    { member: MEMBERS.ajkn, hits: 3, streak: 17 },
    { member: MEMBERS.ismail, hits: 3, streak: 16 },
    { member: MEMBERS.yordfor3, hits: 2, streak: 5 },
    { member: MEMBERS.riley, hits: 1, streak: 0 }
]

/** Who "you" are in the sample, as in the screenshots. */
const ME = MEMBERS.ajkn.name

/** The size of the rank's circle, and of a picture standing in for it. */
const BADGE = 32
/** The rank's badge on a picture's corner. */
const RANK = 18

/**
 * A member's rank as the app's standings show it: their picture ringed in their
 * color with the rank on a badge at its corner, or without one, the rank on
 * their color.
 */
function Rank({
    member,
    rank,
    rowBackground
}: {
    member: SampleMember
    rank: number
    rowBackground: string
}) {
    if (!member.photo)
        return (
            <span
                className="grid shrink-0 place-items-center rounded-full text-[14px] font-bold"
                style={{
                    width: BADGE,
                    height: BADGE,
                    background: member.color,
                    color: member.onColor
                }}
            >
                {rank}
            </span>
        )
    return (
        <span className="relative shrink-0">
            <Avatar member={member} size={BADGE} ring={2} />
            {/* Ringed in the row's background, so it reads on the picture. */}
            <span
                className="absolute grid place-items-center rounded-full text-[10px] font-bold"
                style={{
                    right: -5,
                    bottom: -4,
                    width: RANK,
                    height: RANK,
                    background: member.color,
                    color: member.onColor,
                    boxShadow: `0 0 0 2px ${rowBackground}`
                }}
            >
                {rank}
            </span>
        </span>
    )
}

export function StandingsPreview() {
    return (
        <div
            role="img"
            aria-label="Competition standings for Iceland Lock-in: ajkn and ismail have met all three goals this week, with ajkn ahead on streak, then yordfor3 and riley"
            className="mx-auto w-full max-w-[420px] text-left"
        >
            <div className="mb-4 flex items-center gap-3">
                <CompetitionTile size={36} />
                <div className="min-w-0">
                    <div className="display truncate text-[26px] leading-tight">
                        {COMPETITION.name}
                    </div>
                    <div className="text-[13px] text-ink-3">
                        This week · {GOALS} shared goals
                    </div>
                </div>
            </div>
            <div className={`${CARD} overflow-hidden`}>
                {STANDINGS.map((s, i) => {
                    const me = s.member.name === ME
                    const rowBackground = me
                        ? "var(--bg-sunken)"
                        : "var(--bg-card)"
                    return (
                        <div
                            key={s.member.name}
                            className={`flex items-center gap-3.5 px-5 py-4 ${i > 0 ? "border-t border-line-2" : ""}`}
                            style={{ background: rowBackground }}
                        >
                            <Rank
                                member={s.member}
                                rank={i + 1}
                                rowBackground={rowBackground}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="truncate text-[16px] font-semibold">
                                        {s.member.name}
                                    </span>
                                    {me && (
                                        <span className="text-[11px] text-ink-3">
                                            you
                                        </span>
                                    )}
                                    <span className="mono ml-auto text-[14px] text-ink-3">
                                        <span className="font-bold text-ink">
                                            {s.hits}
                                        </span>
                                        /{GOALS} goals
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[12px] text-ink-3">
                                        {s.streak > 0
                                            ? `${s.streak}-day streak`
                                            : "No streak"}
                                    </span>
                                    {/* One segment per shared goal. */}
                                    <span className="flex gap-1">
                                        {Array.from(
                                            { length: GOALS },
                                            (_, g) => (
                                                <span
                                                    key={g}
                                                    className="h-2 w-[18px] rounded"
                                                    style={{
                                                        background:
                                                            g < s.hits
                                                                ? s.member.color
                                                                : "var(--line)"
                                                    }}
                                                />
                                            )
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const WEEKS = 16
const DAYS = 7

const HABITS = [
    {
        name: "Read 20 minutes",
        color: "var(--lime)",
        onColor: "var(--ink)",
        streak: 24,
        since: 3,
        skip: 13
    },
    {
        name: "Meditate",
        color: SKY,
        onColor: "#fff",
        streak: 15,
        since: 5,
        skip: 9
    }
]

/**
 * A made-up history for a habit: nothing at first, then mostly kept, with no
 * misses during the current streak. One entry per day, oldest first.
 */
function history(h: (typeof HABITS)[number]): boolean[] {
    return Array.from(
        { length: WEEKS * DAYS },
        (_, day) =>
            day >= h.since * DAYS &&
            (day % h.skip !== 0 || day >= WEEKS * DAYS - h.streak)
    )
}

export function HabitsPreview() {
    return (
        <div
            role="img"
            aria-label="Two habits, reading and meditating, each with its streak and a heatmap of the days it was done"
            className="mx-auto flex w-full max-w-[420px] flex-col gap-3 text-left"
        >
            {HABITS.map((h) => {
                const days = history(h)
                const done = days.filter(Boolean).length
                return (
                    <div key={h.name} className={`${CARD} p-5`}>
                        <div className="mb-4 flex items-center gap-3">
                            <span
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-bold"
                                style={{
                                    background: h.color,
                                    color: h.onColor
                                }}
                            >
                                ✓
                            </span>
                            <span className="flex-1 text-[16px] font-semibold">
                                {h.name}
                            </span>
                            <span className="text-right leading-none">
                                <span className="block text-[26px] font-bold tracking-[-0.02em]">
                                    {h.streak}
                                </span>
                                <span className="text-[11px] text-ink-3">
                                    day streak
                                </span>
                            </span>
                        </div>
                        <div
                            className="grid grid-flow-col gap-[3px]"
                            style={{
                                gridTemplateRows: `repeat(${DAYS}, minmax(0, 1fr))`
                            }}
                        >
                            {days.map((kept, day) => (
                                <span
                                    key={day}
                                    className="aspect-square rounded-[3px]"
                                    style={{
                                        background: kept
                                            ? h.color
                                            : "var(--bg-sunken)"
                                    }}
                                />
                            ))}
                        </div>
                        <div className="mono mt-3 text-center text-[12px] text-ink-3">
                            <span className="font-bold text-ink">{done}</span>{" "}
                            days done
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
