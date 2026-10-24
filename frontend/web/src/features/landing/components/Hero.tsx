/**
 * Hero section of Beacc.
 */
export function Hero() {
    return (
        <section className="px-16 pb-20 pt-16 text-center">
            <h1 className="display mx-auto mb-6 mt-0 max-w-[900px] text-[80px]">
                Goals get done when friends are{" "}
                <span className="rounded-xl bg-lime px-3">watching.</span>
            </h1>

            <p className="mx-auto mb-3 mt-0 max-w-[560px] text-[19px] leading-[1.5] text-ink-2">
                Track your goals and habits, and compete with your friends.
            </p>

            <p className="m-0 text-[15px] text-ink-3">
                Coming soon to iOS and Android.
            </p>
        </section>
    )
}
