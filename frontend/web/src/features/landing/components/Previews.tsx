// Drawn samples of the app's competition and habits screens. Like FeedPreview,
// they stay crisp at any width and are read as one image by screen readers.

const CARD = "rounded-2xl border border-line-2 bg-bg-card shadow-sm"

const SKY = "#4aa8f0"
const PLUM = "#8e44ad"

const STANDINGS = [
    {
        name: "alex",
        color: "var(--lime)",
        ink: "var(--ink)",
        onPace: 3,
        streak: 17
    },
    {
        name: "jordan",
        color: "var(--coral)",
        ink: "#fff",
        onPace: 3,
        streak: 16
    },
    { name: "sam", color: SKY, ink: "#fff", onPace: 2, streak: 5 },
    { name: "riley", color: PLUM, ink: "#fff", onPace: 1, streak: 0 }
]

export function StandingsPreview() {
    return (
        <div
            role="img"
            aria-label="Competition standings: alex and jordan are on pace for all three goals, with alex ahead on streak, then sam and riley"
            className={`${CARD} mx-auto w-full max-w-[420px] p-5 text-left`}
        >
            <div className="text-[20px] font-semibold tracking-[-0.02em]">
                Fall Fitness Challenge
            </div>
            <div className="mb-4 mt-1 text-[13px] text-ink-3">
                4 members · 3 goals
            </div>
            <div className="mb-1 flex items-center px-2 text-[12px] text-ink-3">
                <span className="flex-1">Member</span>
                <span className="w-[76px]">On pace</span>
                <span className="w-9 text-right">Streak</span>
            </div>
            {STANDINGS.map((s, i) => (
                <div
                    key={s.name}
                    className={`flex items-center rounded-full px-2 py-2 ${i === 0 ? "bg-bg-sunken" : ""}`}
                >
                    <span
                        className="mono mr-2.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                        style={{ background: s.color, color: s.ink }}
                    >
                        {i + 1}
                    </span>
                    <span className="flex-1 text-[15px] font-semibold">
                        {s.name}
                    </span>
                    <span className="flex w-[76px] items-center gap-1">
                        {[0, 1, 2].map((dot) => (
                            <span
                                key={dot}
                                className="h-1.5 w-3 rounded-full"
                                style={{
                                    background:
                                        dot < s.onPace ? s.color : "var(--line)"
                                }}
                            />
                        ))}
                        <span className="mono ml-1 text-[13px] font-semibold">
                            {s.onPace}/3
                        </span>
                    </span>
                    <span className="mono w-9 text-right text-[13px] font-semibold">
                        {s.streak}d
                    </span>
                </div>
            ))}
        </div>
    )
}

const WEEKS = 16
const DAYS = 7

const HABITS = [
    {
        name: "Read 20 minutes",
        color: "var(--lime)",
        streak: 24,
        since: 3,
        skip: 13
    },
    { name: "Meditate", color: SKY, streak: 15, since: 5, skip: 9 }
]

export function HabitsPreview() {
    return (
        <div
            role="img"
            aria-label="Two habits, reading and meditating, each with a heatmap of the days it was done"
            className="mx-auto flex w-full max-w-[420px] flex-col gap-3 text-left"
        >
            {HABITS.map((h) => (
                <div key={h.name} className={`${CARD} p-4`}>
                    <div className="mb-3 flex items-center gap-3">
                        <span
                            className="grid h-8 w-8 place-items-center rounded-full text-[15px] font-bold"
                            style={{ background: h.color }}
                        >
                            ✓
                        </span>
                        <div>
                            <div className="text-[15px] font-semibold">
                                {h.name}
                            </div>
                            <div className="mono text-[12px] text-ink-3">
                                {h.streak} day streak
                            </div>
                        </div>
                    </div>
                    <div
                        className="grid grid-flow-col gap-[3px]"
                        style={{
                            gridTemplateRows: `repeat(${DAYS}, minmax(0, 1fr))`
                        }}
                    >
                        {Array.from({ length: WEEKS * DAYS }, (_, day) => {
                            // A made-up history: nothing at first, then mostly kept,
                            // with no misses during the current streak.
                            const done =
                                day >= h.since * DAYS &&
                                (day % h.skip !== 0 ||
                                    day >= WEEKS * DAYS - h.streak)
                            return (
                                <span
                                    key={day}
                                    className="aspect-square rounded-[3px]"
                                    style={{
                                        background: done
                                            ? h.color
                                            : "var(--bg-sunken)"
                                    }}
                                />
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
