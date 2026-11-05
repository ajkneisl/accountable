import { APP_STORE_URL } from "../appStore"

/**
 * Hero section of Beacc: the promise, the download, and the app itself. The phones
 * run off the bottom of the section, which also keeps their tab bars out of view.
 */
export function Hero() {
    return (
        <section className="overflow-hidden border-b border-line-2 px-6 pt-10 text-center md:px-16 md:pt-16">
            <h1 className="display mx-auto mb-6 mt-0 max-w-[900px] text-[44px] leading-[1.12] sm:text-[60px] lg:text-[80px]">
                Goals get done when friends are{" "}
                <span className="rounded-xl bg-lime px-3 box-decoration-clone">
                    watching.
                </span>
            </h1>

            <p className="mx-auto mb-0 mt-0 max-w-[600px] text-[17px] leading-[1.5] text-ink-2 md:text-[19px]">
                Beacc tracks your goals from the apps you already use, then puts
                you up against your friends.
            </p>

            <div className="mt-7 flex flex-col items-center gap-3">
                <a href={APP_STORE_URL} className="btn btn-primary btn-lg">
                    Download on the App Store
                </a>
                <span className="text-[13px] text-ink-3">
                    Available for iPhone
                </span>
            </div>

            <div className="mx-auto mt-8 flex h-[380px] max-w-[980px] items-start justify-center md:mt-10 md:h-[500px]">
                <img
                    src="/screenshots/goals.png"
                    alt="The Goals tab, showing a 19 day streak and this week's workouts"
                    width={501}
                    height={900}
                    className="relative z-0 -mr-14 mt-28 hidden h-auto w-[300px] -rotate-3 md:block"
                />
                <img
                    src="/screenshots/competition.png"
                    alt="A competition's standings, with four friends ranked by goals on pace"
                    width={501}
                    height={900}
                    className="relative z-10 h-auto w-[300px] md:w-[360px]"
                />
                <img
                    src="/screenshots/habits.png"
                    alt="The Habits tab, with a heatmap of every day each habit was done"
                    width={501}
                    height={900}
                    className="relative z-0 -ml-14 mt-28 hidden h-auto w-[300px] rotate-3 md:block"
                />
            </div>
        </section>
    )
}
