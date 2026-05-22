// Landing — desktop marketing site (1440 wide).
// Ported from the design bundle; composed from ./components.

import { NavBar } from "./components/NavBar"
import { Hero } from "./components/Hero"
import { SourceMarquee } from "./components/SourceMarquee"
import { HowItWorks } from "./components/HowItWorks"
import { GoalsShowcase } from "./components/GoalsShowcase"
import { CompetitionTease } from "./components/CompetitionTease"
import { CTA } from "./components/CTA"
import { Footer } from "./components/Footer"

export default function Landing() {
    return (
        <div className="acc" style={{ width: 1440, margin: "0 auto" }}>
            <NavBar />
            <Hero />
            <SourceMarquee />
            <HowItWorks />
            <GoalsShowcase />
            <CompetitionTease />
            <CTA />
            <Footer />
        </div>
    )
}
