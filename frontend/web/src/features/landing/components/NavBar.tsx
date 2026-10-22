// Landing top navigation.

import { LogoLink } from "../../common/primitives"

// Each entry jumps to a section's id on the landing page.
const NAV_LINKS = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Sources", href: "#sources" },
    { label: "Goals", href: "#goals" },
    { label: "Competitions", href: "#competitions" }
]

export function NavBar() {
    return (
        <nav className="flex items-center justify-between px-16 py-6">
            <LogoLink />
            <div className="flex items-center gap-8 text-[14px]">
                {NAV_LINKS.map((l) => (
                    <a
                        key={l.label}
                        href={l.href}
                        className="cursor-pointer text-ink-2 no-underline"
                    >
                        {l.label}
                    </a>
                ))}
            </div>
            <div className="flex items-center gap-2.5">
                <span className="chip">
                    <span className="dot-lime" /> iOS &amp; Android · coming soon
                </span>
                <a href="#download" className="btn btn-primary btn-sm">
                    Get the app
                </a>
            </div>
        </nav>
    )
}
