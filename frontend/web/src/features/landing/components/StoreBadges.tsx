// App Store / Google Play badges. Both stores are pending, so the badges are inert.

function AppleIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.54zM14.18 6.13c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.69-.92 2.69.98.08 1.98-.5 2.58-1.23z" />
        </svg>
    )
}

function PlayIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4.2 2.4c-.25.26-.4.66-.4 1.18v16.84c0 .52.15.92.4 1.18l.06.06L13.7 12.2v-.22L4.26 2.34l-.06.06z" />
            <path d="M16.85 15.35 13.7 12.2v-.22l3.15-3.15.07.04 3.73 2.12c1.07.6 1.07 1.6 0 2.2l-3.73 2.12-.07.04z" opacity=".75" />
            <path d="M16.92 15.31 13.7 12.09 4.2 21.6c.35.37.93.42 1.58.05l11.14-6.34" opacity=".55" />
            <path d="M16.92 8.87 5.78 2.53c-.65-.37-1.23-.32-1.58.05l9.5 9.51 3.22-3.22z" opacity=".9" />
        </svg>
    )
}

const STORES = [
    { name: "App Store", icon: <AppleIcon /> },
    { name: "Google Play", icon: <PlayIcon /> }
]

/**
 * Download badges for the mobile apps, marked "coming soon" until the store
 * listings go live.
 */
export function StoreBadges({ tone = "dark" }: { tone?: "dark" | "light" }) {
    const cls =
        tone === "dark" ? "bg-ink text-bg" : "bg-bg text-ink"
    return (
        <div className="flex flex-wrap items-center gap-3">
            {STORES.map((s) => (
                <div
                    key={s.name}
                    aria-label={`${s.name} — coming soon`}
                    className={`flex cursor-default select-none items-center gap-3 rounded-2xl px-5 py-3 ${cls}`}
                >
                    {s.icon}
                    <div className="text-left leading-tight">
                        <div className="text-[11px] uppercase tracking-[0.06em] opacity-60">
                            Coming soon to
                        </div>
                        <div className="text-[17px] font-semibold tracking-[-0.01em]">
                            {s.name}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
