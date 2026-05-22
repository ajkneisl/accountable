// One row of the by-source breakdown — you vs Marcus on a single category.

import { SourceTile } from "../../common/primitives"
import type { Cat } from "../types"

export function ScoreDelta({ won, lost, label, source, glyph, tile, leader }: Cat) {
    const total = won + lost
    const wpct = total ? (won / total) * 100 : 50
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 0",
                borderTop: "1px solid var(--line-2)"
            }}
        >
            <SourceTile label={glyph} variant={tile} />
            <div style={{ width: 160 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {source}
                </div>
            </div>
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                }}
            >
                <div
                    className="mono tab"
                    style={{
                        width: 32,
                        textAlign: "right",
                        fontWeight: leader === "you" ? 700 : 500,
                        color:
                            leader === "you"
                                ? "var(--lime-ink)"
                                : "var(--ink-3)"
                    }}
                >
                    {won}
                </div>
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        height: 10,
                        borderRadius: 5,
                        overflow: "hidden",
                        background: "var(--line-2)"
                    }}
                >
                    <div
                        style={{
                            width: wpct + "%",
                            height: "100%",
                            background: "var(--lime)"
                        }}
                    />
                    <div
                        style={{
                            width: 100 - wpct + "%",
                            height: "100%",
                            background: "var(--coral)"
                        }}
                    />
                </div>
                <div
                    className="mono tab"
                    style={{
                        width: 32,
                        textAlign: "left",
                        fontWeight: leader === "marcus" ? 700 : 500,
                        color:
                            leader === "marcus"
                                ? "var(--coral-ink)"
                                : "var(--ink-3)"
                    }}
                >
                    {lost}
                </div>
            </div>
            <div style={{ width: 80, textAlign: "right" }}>
                {leader === "you" && (
                    <span
                        className="chip"
                        style={{
                            background: "var(--lime-soft)",
                            color: "var(--lime-ink)"
                        }}
                    >
                        <span className="dot-lime" /> +{won - lost}
                    </span>
                )}
                {leader === "marcus" && (
                    <span
                        className="chip"
                        style={{
                            background: "var(--coral-soft)",
                            color: "var(--coral-ink)"
                        }}
                    >
                        <span className="dot-coral" /> +{lost - won}
                    </span>
                )}
                {leader === "tie" && <span className="chip">tied</span>}
            </div>
        </div>
    )
}
