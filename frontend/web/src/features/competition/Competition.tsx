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
        <div
            className="acc"
            style={{
                width: 1440,
                margin: "0 auto",
                minHeight: 1100,
                display: "flex"
            }}
        >
            <Sidebar onSignOut={signOut} />

            <main style={{ flex: 1, padding: "28px 36px" }}>
                <CompetitionHeader />
                <Scoreboard />

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr",
                        gap: 16,
                        marginBottom: 18
                    }}
                >
                    <DailyScoreCard />
                    <BreakdownCard />
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1.1fr 1fr",
                        gap: 16
                    }}
                >
                    <TimelineCard />
                    <TrashTalkCard />
                </div>
            </main>
        </div>
    )
}
