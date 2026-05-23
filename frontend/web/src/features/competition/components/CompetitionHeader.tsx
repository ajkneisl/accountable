// Competition page top bar — title, live timer, and actions.

export function CompetitionHeader() {
    return (
        <div className="mb-6 flex items-start justify-between">
            <div>
                <div className="eyebrow mb-2">
                    HEAD-TO-HEAD · WEEK 19 · MAY 12 — 18
                </div>
                <h1 className="display m-0 text-[44px]">You vs Marcus</h1>
            </div>
            <div className="flex items-center gap-2.5">
                <span className="chip border border-line-2 bg-bg-card">
                    <span className="dot-lime" /> live · 4d 5h 18m left
                </span>
                <button className="btn btn-line btn-sm">Invite onlooker</button>
                <button className="btn btn-primary btn-sm">Trash talk</button>
            </div>
        </div>
    )
}
