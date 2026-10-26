const FEATURES = [
    { title: "Track goals", body: "Set a target and watch your progress toward it." },
    { title: "Track habits", body: "Build streaks out of the things you do every day." },
    { title: "Compete with friends", body: "Go head-to-head and see who keeps up." }
]

const SOURCES = ["LeetCode", "GitHub", "Apple Health"]

/**
 * What Beacc does, and the sources it pulls from.
 */
export function Features() {
    return (
        <section className="px-6 pb-16 md:px-16 md:pb-24">
            <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
                {FEATURES.map((f) => (
                    <div key={f.title}>
                        <h3 className="m-0 mb-2 text-2xl tracking-[-0.02em]">
                            {f.title}
                        </h3>
                        <p className="m-0 text-[15px] leading-[1.5] text-ink-2">
                            {f.body}
                        </p>
                    </div>
                ))}
            </div>

            <p className="mt-12 text-center text-[15px] text-ink-2 md:mt-16 md:text-[17px]">
                Tracks {SOURCES.slice(0, -1).join(", ")}, and {SOURCES.at(-1)}.
            </p>
        </section>
    )
}
