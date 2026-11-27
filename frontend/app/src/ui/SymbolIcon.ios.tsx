// An SF Symbol, drawn by SwiftUI. Elsewhere SymbolIcon.tsx stands in with
// line glyphs for the symbols the app uses.

import { Host, Image } from "@expo/ui/swift-ui"
import type { SymbolIconProps } from "./SymbolIcon"

export type { AppSymbol, SymbolIconProps } from "./SymbolIcon"

export function SymbolIcon({ name, size, color, frame }: SymbolIconProps) {
    if (frame != null)
        return (
            // A fixed frame, not matchContents: that size arrives after layout
            // and can leave the glyph sitting low. And no safe area: up by the
            // status bar, SwiftUI would inset the glyph by it, pushing it below
            // its container whenever layout ran while under the bar.
            <Host style={{ width: frame, height: frame }} ignoreSafeArea="all">
                <Image systemName={name} size={size} color={color} />
            </Host>
        )
    return (
        <Host matchContents>
            <Image systemName={name} size={size} color={color} />
        </Host>
    )
}
