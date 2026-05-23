// One row of the by-source breakdown — you vs Marcus on a single category.

import { SourceTile } from "../../common/primitives"
import type { Cat } from "../types"

export function ScoreDelta({ won, lost, label, source, glyph, tile, leader }: Cat) {
    const total = won + lost
    const wpct = total ? (won / total) * 100 : 50
    return (
        <div className="flex items-center gap-4 border-t border-line-2 py-3.5">
            <SourceTile label={glyph} variant={tile} />
            <div className="w-40">
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-[11px] text-ink-3">{source}</div>
            </div>
            <div className="flex flex-1 items-center gap-3">
                <div
                    className={`mono tab w-8 text-right ${leader === "you" ? "font-bold text-lime-ink" : "font-medium text-ink-3"}`}
                >
                    {won}
                </div>
                <div className="flex h-2.5 flex-1 items-center overflow-hidden rounded-[5px] bg-line-2">
                    <div
                        className="h-full bg-lime"
                        style={{ width: wpct + "%" }}
                    />
                    <div
                        className="h-full bg-coral"
                        style={{ width: 100 - wpct + "%" }}
                    />
                </div>
                <div
                    className={`mono tab w-8 text-left ${leader === "marcus" ? "font-bold text-coral-ink" : "font-medium text-ink-3"}`}
                >
                    {lost}
                </div>
            </div>
            <div className="w-20 text-right">
                {leader === "you" && (
                    <span className="chip bg-lime-soft text-lime-ink">
                        <span className="dot-lime" /> +{won - lost}
                    </span>
                )}
                {leader === "marcus" && (
                    <span className="chip bg-coral-soft text-coral-ink">
                        <span className="dot-coral" /> +{lost - won}
                    </span>
                )}
                {leader === "tie" && <span className="chip">tied</span>}
            </div>
        </div>
    )
}
