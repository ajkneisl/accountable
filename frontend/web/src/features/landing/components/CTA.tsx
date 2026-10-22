import { StoreBadges } from "./StoreBadges"

/**
 * Closing call to action on the landing page — where to get the apps.
 */
export function CTA() {
    return (
        <section id="download" className="px-16 pb-20 pt-10">
            <div className="mx-auto max-w-[720px] text-center">
                <h2 className="display mb-5 mt-0 text-[72px]">
                    The goal is small.
                    <br />
                    The friends are the trick.
                </h2>

                <p className="mb-7 text-lg text-ink-2">
                    Accountable is coming soon to the App Store and Google
                    Play. Always free. Unless it costs too much, then maybe not.
                    It's still open source though, right?
                </p>

                <div className="flex justify-center">
                    <StoreBadges />
                </div>
            </div>
        </section>
    )
}
