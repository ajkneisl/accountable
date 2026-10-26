import { NavBar } from "./components/NavBar"
import { Hero } from "./components/Hero"
import { Features } from "./components/Features"

/**
 * The primary landing page.
 */
export default function Landing() {
    return (
        <div className="acc mx-auto w-full max-w-[1440px]">
            <NavBar />
            <Hero />
            <Features />
        </div>
    )
}
