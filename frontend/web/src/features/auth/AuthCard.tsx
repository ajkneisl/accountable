import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { LogoLink } from "../common/primitives"

export const labelClass = "block text-xs font-medium text-ink-2 mb-1.5"
export const inputClass =
    "w-full border border-line rounded-[10px] px-3.5 py-[11px] text-sm outline-0 text-ink bg-bg-card mb-3.5 font-[inherit]"

/** A single centered card under the site header, for the password reset pages. */
export function AuthCard({
    title,
    subtitle,
    children
}: {
    title: string
    subtitle?: string
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
            <div className="flex flex-1 items-center justify-center px-6 py-10">
                <div className="card w-full max-w-[420px] p-8">
                    <h2 className="mb-1 mt-0 text-[22px] font-bold tracking-[-0.02em]">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="mb-[22px] mt-0 text-[13px] text-ink-3">
                            {subtitle}
                        </p>
                    )}
                    {children}
                </div>
            </div>
        </div>
    )
}

/** Error messages from a failed request, styled like the sign-in form's. */
export function FormErrors({ errors }: { errors: string[] }) {
    if (errors.length === 0) return null
    return (
        <ul
            role="alert"
            className="mt-3 flex list-none flex-col gap-1 rounded-[10px] bg-coral-soft p-3 text-xs text-coral-ink"
        >
            {errors.map((msg, i) => (
                <li key={i}>{msg}</li>
            ))}
        </ul>
    )
}

/** The messages to show for a caught request error. */
export function errorMessages(
    err: unknown,
    fallback = "Something went wrong"
): string[] {
    if (err && typeof err === "object" && "messages" in err)
        return (err as { messages: string[] }).messages
    if (err instanceof Error) return [err.message]
    return [fallback]
}
