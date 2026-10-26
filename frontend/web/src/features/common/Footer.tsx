import { LogoLink } from "./primitives"

/**
 * Site-wide footer — wordmark + copyright.
 */
export function Footer() {
    return (
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line-2 px-6 py-8 text-[13px] text-ink-3 md:px-16 md:py-10">
            <LogoLink />
            <div>© 2026 · built by two chuds</div>
        </footer>
    )
}
