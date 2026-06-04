// Shared titled main column for the account pages (Profile, Settings).
// The sidebar + data live in the persistent AppShell, so these render only their content.

import type { ReactNode } from "react"

export function AccountShell({
    eyebrow,
    title,
    children
}: {
    eyebrow: string
    title: string
    children: ReactNode
}) {
    return (
        <main className="flex-1 px-9 py-7">
            <div className="mb-7">
                <div className="eyebrow mb-2">{eyebrow}</div>
                <h1 className="display m-0 text-[40px]">{title}</h1>
            </div>
            {children}
        </main>
    )
}

/** Label/value row used inside account cards. */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 border-t border-line-2 py-3 first:border-t-0">
            <div className="text-[13px] text-ink-3">{label}</div>
            <div className="text-[14px] font-medium">{value}</div>
        </div>
    )
}
