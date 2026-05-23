// Competition — "You vs Marcus" head-to-head week.
// Ported from the design bundle; composed from ./components.

import { Sidebar } from "../common/Sidebar"
import { useSignOut } from "../../auth"
import { CompetitionHeader } from "./components/CompetitionHeader"
import { Scoreboard } from "./components/Scoreboard"
import { DailyScoreCard } from "./components/DailyScoreCard"
import { BreakdownCard } from "./components/BreakdownCard"
import { TimelineCard } from "./components/TimelineCard"
import { TrashTalkCard } from "./components/TrashTalkCard"

export default function Competition() {
    const signOut = useSignOut()
    return (
        <div className="acc mx-auto flex min-h-[1100px] w-[1440px]">
            <Sidebar onSignOut={signOut} />

            <main className="flex-1 px-9 py-7">
                <CompetitionHeader />
                <Scoreboard />

                <div
                    className="mb-[18px] grid gap-4"
                    style={{ gridTemplateColumns: "1.2fr 1fr" }}
                >
                    <DailyScoreCard />
                    <BreakdownCard />
                </div>

                <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: "1.1fr 1fr" }}
                >
                    <TimelineCard />
                    <TrashTalkCard />
                </div>
            </main>
        </div>
    )
}
