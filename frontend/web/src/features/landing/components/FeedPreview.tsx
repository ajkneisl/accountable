import { IntegrationIcon } from "../../billboard/components/IntegrationIcon"
import {
    Avatar,
    COMPETITION,
    CompetitionTile,
    MEMBERS,
    type SampleMember
} from "./samples"

interface SampleCard {
    member: SampleMember
    source: string
    day: string
    title: string
    lines: string[]
    progress: string
    met: boolean
    likes: number
    liked: boolean
}

// Sample people, matching the competition in the screenshots.
const CARDS: SampleCard[] = [
    {
        member: MEMBERS.yordfor3,
        source: "apple_fitness",
        day: "Today",
        title: "Run",
        lines: ["32 min, 410 cal"],
        progress: "2/3",
        met: false,
        likes: 3,
        liked: true
    },
    {
        member: MEMBERS.ismail,
        source: "github",
        day: "Today",
        title: "5 commits",
        lines: ["3 in ismail/tracker", "2 in ismail/dotfiles"],
        progress: "5/5",
        met: true,
        likes: 2,
        liked: false
    },
    {
        member: MEMBERS.riley,
        source: "apple_sleep",
        day: "Yesterday",
        title: "7h 40m of sleep",
        lines: [],
        progress: "7.7/7",
        met: true,
        likes: 1,
        liked: false
    }
]

function Heart({ filled }: { filled: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
        >
            <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.7 8.100 3.700 4.800 7.100 4.800c2 0 3.700 1.100 4.900 3 1.200-1.900 2.900-3 4.900-3 3.400 0 5.400 3.300 4.300 6.400-1.700 4.700-9.200 9.300-9.200 9.300z" />
        </svg>
    )
}

function Card({ card }: { card: SampleCard }) {
    return (
        <div className="rounded-2xl border border-line-2 bg-bg-card p-4 text-left shadow-sm">
            <div className="flex items-center gap-3">
                <Avatar member={card.member} size={36} />
                <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">
                        {card.member.name}
                    </div>
                    <div className="text-[12px] text-ink-3">{card.day}</div>
                </div>
                <span
                    className={`mono text-[15px] font-bold ${card.met ? "text-lime-ink" : "text-ink-2"}`}
                >
                    {card.progress}
                </span>
                <span className="grid h-6 w-6 place-items-center text-ink">
                    <IntegrationIcon name={card.source} />
                </span>
            </div>
            <div className="mt-3 text-[20px] font-semibold tracking-[-0.02em]">
                {card.title}
            </div>
            {card.lines.map((line) => (
                <div key={line} className="text-[13px] text-ink-2">
                    {line}
                </div>
            ))}
            <div className="mt-3 flex items-center justify-between gap-3">
                {/* The competition as it looks on the Competitions tab: its
                    icon, then its name. */}
                <span className="flex min-w-0 items-center gap-2 rounded-[10px] bg-bg-sunken py-1 pl-1 pr-2">
                    <CompetitionTile size={22} />
                    <span className="truncate text-[13px] font-semibold">
                        {COMPETITION.name}
                    </span>
                    <span className="text-[13px] text-ink-3">›</span>
                </span>
                <span
                    className={`flex items-center gap-1.5 text-[13px] font-semibold ${card.liked ? "text-coral" : "text-ink-3"}`}
                >
                    <span className="text-ink-2">{card.likes}</span>
                    <Heart filled={card.liked} />
                </span>
            </div>
        </div>
    )
}

/**
 * A sample of the app's feed, drawn rather than screenshotted so it stays crisp at
 * any width. Purely illustrative, so it's hidden from screen readers as one image.
 */
export function FeedPreview() {
    return (
        <div
            role="img"
            aria-label="A feed of updates from friends: a run, five commits and a good night's sleep, each with hearts"
            className="mx-auto flex w-full max-w-[400px] flex-col gap-3"
        >
            {CARDS.map((card) => (
                <Card key={card.member.name} card={card} />
            ))}
        </div>
    )
}
