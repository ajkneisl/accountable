// Competition page top bar — title, live timer, and actions.

export function CompetitionHeader() {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 24
            }}
        >
            <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                    HEAD-TO-HEAD · WEEK 19 · MAY 12 — 18
                </div>
                <h1 className="display" style={{ fontSize: 44, margin: 0 }}>
                    You vs Marcus
                </h1>
            </div>
            <div
                style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center"
                }}
            >
                <span
                    className="chip"
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--line-2)"
                    }}
                >
                    <span className="dot-lime" /> live · 4d 5h 18m left
                </span>
                <button className="btn btn-line btn-sm">
                    Invite onlooker
                </button>
                <button className="btn btn-primary btn-sm">Trash talk</button>
            </div>
        </div>
    )
}
