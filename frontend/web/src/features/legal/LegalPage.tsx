import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { LogoLink } from "../common/primitives"

/** Where people can reach us about their data or these terms. */
export const CONTACT_EMAIL = "support@beacc.app"

/** Shared shell for the privacy policy, terms of service and support pages. */
export function LegalPage({
    title,
    updated,
    children
}: {
    title: string
    /** Human-readable date the document last changed, if it's versioned. */
    updated?: string
    children: ReactNode
}) {
    return (
        <div className="acc mx-auto flex w-full max-w-[1440px] flex-1 flex-col bg-bg">
            <header className="flex items-center justify-between px-6 py-6 md:px-9">
                <LogoLink />
                <Link to="/" className="text-[13px] text-ink-3 no-underline">
                    ← Back to home
                </Link>
            </header>

            <article className="mx-auto w-full max-w-[720px] px-6 pb-16 pt-8 text-[15px] leading-[1.65] text-ink-2 [&_a]:text-ink [&_a]:underline [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:tracking-[-0.01em] [&_h2]:text-ink [&_li]:mb-1.5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6">
                <h1 className="display mb-2 mt-0 text-[40px] leading-[1.1] text-ink md:text-[48px]">
                    {title}
                </h1>
                {updated && (
                    <p className="text-[13px] text-ink-3">
                        Last updated {updated}
                    </p>
                )}
                {children}
            </article>
        </div>
    )
}

/** A mailto link to [CONTACT_EMAIL]. */
export function ContactLink() {
    return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
}
