import { NavBar } from "./components/NavBar"
import { Hero } from "./components/Hero"
import { SourceMarquee } from "./components/SourceMarquee"
import { HowItWorks } from "./components/HowItWorks"
import { GoalsShowcase } from "./components/GoalsShowcase"
import { CompetitionTease } from "./components/CompetitionTease"
import { CTA } from "./components/CTA"

/**
 * The primary landing page.
 */
export default function Landing() {
    return (
        <div className="acc mx-auto w-[1440px]">
            <NavBar />
            <Hero />
            <SourceMarquee />
            <HowItWorks />
            <GoalsShowcase />
            <CompetitionTease />
            <CTA />
        </div>
    )
}
