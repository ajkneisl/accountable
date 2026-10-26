/**
 * Hero section of Beacc.
 */
export function Hero() {
    return (
        <section className="px-6 pb-14 pt-10 text-center md:px-16 md:pb-20 md:pt-16">
            <h1 className="display mx-auto mb-6 mt-0 max-w-[900px] text-[44px] leading-[1.12] sm:text-[60px] lg:text-[80px]">
                Goals get done when friends are{" "}
                <span className="rounded-xl bg-lime px-3 box-decoration-clone">
                    watching.
                </span>
            </h1>

            <p className="mx-auto mb-3 mt-0 max-w-[560px] text-[17px] leading-[1.5] text-ink-2 md:text-[19px]">
                Track your goals and habits, and compete with your friends.
            </p>

            <p className="m-0 text-[15px] text-ink-3">
                Coming soon to iOS and Android.
            </p>
        </section>
    )
}
