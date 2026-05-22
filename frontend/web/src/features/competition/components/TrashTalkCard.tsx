// Card with the trash-talk chat thread and a composer.

import { TRASH } from "../data"

export function TrashTalkCard() {
    return (
        <div
            className="card"
            style={{
                padding: 22,
                display: "flex",
                flexDirection: "column"
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14
                }}
            >
                <div className="eyebrow">TRASH TALK</div>
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    Jess joined as judge
                </span>
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    flex: 1
                }}
            >
                {TRASH.map((m, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            flexDirection: m.mine ? "row-reverse" : "row",
                            alignItems: "flex-end",
                            gap: 8
                        }}
                    >
                        <div
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: m.color,
                                color: m.dark ? "#fff" : "var(--ink)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 11,
                                fontWeight: 600,
                                flexShrink: 0
                            }}
                        >
                            {m.who}
                        </div>
                        <div
                            style={{
                                background: m.mine
                                    ? "var(--ink)"
                                    : "var(--bg-sunken)",
                                color: m.mine ? "var(--bg)" : "var(--ink)",
                                borderRadius: 14,
                                padding: "8px 12px",
                                fontSize: 13,
                                lineHeight: 1.4,
                                maxWidth: 260
                            }}
                        >
                            {!m.mine && (
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--ink-3)",
                                        marginBottom: 2
                                    }}
                                >
                                    {m.name}
                                </div>
                            )}
                            {m.body}
                        </div>
                        <div
                            className="mono"
                            style={{
                                fontSize: 10,
                                color: "var(--ink-3)",
                                alignSelf: "flex-end"
                            }}
                        >
                            {m.time}
                        </div>
                    </div>
                ))}
            </div>
            <div
                style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid var(--line-2)"
                }}
            >
                <input
                    placeholder="say something regrettable…"
                    style={{
                        flex: 1,
                        border: "1px solid var(--line)",
                        borderRadius: 999,
                        padding: "8px 14px",
                        fontSize: 13,
                        outline: 0,
                        font: "inherit"
                    }}
                />
                <button className="btn btn-primary btn-sm">Send</button>
            </div>
        </div>
    )
}
