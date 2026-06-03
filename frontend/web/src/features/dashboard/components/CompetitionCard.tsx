// Summary card — the top competition the user is in.

import { useAtomValue } from "jotai"
import { Link } from "react-router-dom"
import type { CompetitionDetail, CompetitionMember } from "@shared/index"
import { userAtom } from "../../../auth"

/** Reorder members so the authenticated user is first. */
function orderMembers(
    members: CompetitionMember[],
    userID: string | undefined
): CompetitionMember[] {
    if (!userID) return members
    const me = members.find((m) => m.userID === userID)
    if (!me) return members
    return [me, ...members.filter((m) => m.userID !== userID)]
}

function Avatar({
    label,
    bg,
    fg
}: {
    label: string
    bg: string
    fg: string
}) {
    return (
        <div
            className="grid h-9 w-9 place-items-center rounded-full font-bold"
            style={{ background: bg, color: fg }}
        >
            {label}
        </div>
    )
}

export function CompetitionCard({
    competition
}: {
    competition: CompetitionDetail | null
}) {
    const user = useAtomValue(userAtom)

    if (!competition) {
        return (
            <div className="card border-none bg-ink p-6 text-bg">
                <div className="mb-3.5 eyebrow text-lime">COMPETITION</div>
                <div className="mb-3.5 text-[15px] opacity-80">
                    No competitions yet. Start one with a friend.
                </div>
                <Link
                    to="/competition"
                    className="btn btn-accent btn-sm w-full"
                >
                    Open competition →
                </Link>
            </div>
        )
    }

    const ordered = orderMembers(competition.members, user?.userID)
    const me = ordered[0]
    const them = ordered[1]
    const subtitle =
        ordered.length === 1
            ? `Just you so far. Share code ${competition.joinCode}.`
            : `${competition.members.length} members · ${competition.goals.length} goals`

    return (
        <div className="card border-none bg-ink p-6 text-bg">
            <div className="mb-3.5 flex items-center justify-between">
                <div className="eyebrow text-lime">LIVE COMPETITION</div>
                <span className="chip bg-white/10 text-bg">
                    {competition.joinCode}
                </span>
            </div>
            <div className="mb-3.5 flex items-center gap-[18px]">
                <div className="flex items-center gap-2">
                    <Avatar
                        label={(me?.username[0] ?? "?").toUpperCase()}
                        bg="var(--lime)"
                        fg="var(--ink)"
                    />
                    <div className="mono text-4xl font-bold tracking-[-0.03em]">
                        {me?.streak ?? 0}
                    </div>
                </div>
                <div className="opacity-40">vs</div>
                <div className="flex items-center gap-2">
                    <Avatar
                        label={(them?.username[0] ?? "—").toUpperCase()}
                        bg="var(--coral)"
                        fg="#fff"
                    />
                    <div
                        className={`mono text-4xl font-bold tracking-[-0.03em] ${
                            them ? "opacity-60" : "opacity-30"
                        }`}
                    >
                        {them?.streak ?? 0}
                    </div>
                </div>
            </div>
            <div className="mb-3.5 text-[13px] opacity-70">
                {competition.name} · {subtitle}
            </div>
            <Link to="/competition" className="btn btn-accent btn-sm w-full">
                Open competition →
            </Link>
        </div>
    )
}
