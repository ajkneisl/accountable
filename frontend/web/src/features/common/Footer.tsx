import { Link } from "react-router-dom"
import { LogoLink } from "./primitives"

/**
 * Site-wide footer — wordmark, legal links + copyright.
 */
export function Footer() {
    return (
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line-2 px-6 py-8 text-[13px] text-ink-3 md:px-16 md:py-10">
            <LogoLink />
            <div className="flex flex-wrap items-center gap-5">
                <Link to="/support" className="text-inherit no-underline">
                    Support
                </Link>
                <Link to="/privacy" className="text-inherit no-underline">
                    Privacy
                </Link>
                <Link to="/tos" className="text-inherit no-underline">
                    Terms
                </Link>
                <span>© 2026 · built by two chuds</span>
            </div>
        </footer>
    )
}
