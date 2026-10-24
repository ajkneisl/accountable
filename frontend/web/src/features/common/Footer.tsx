import { LogoLink } from "./primitives"

/**
 * Site-wide footer — wordmark + copyright.
 */
export function Footer() {
    return (
        <footer className="flex items-center justify-between border-t border-line-2 px-16 py-10 text-[13px] text-ink-3">
            <LogoLink />
            <div>© 2026 · built by two chuds</div>
        </footer>
    )
}
