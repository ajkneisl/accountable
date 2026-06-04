import { Link } from "react-router-dom"

/**
 * Closing call to action on the landing page.
 */
export function CTA() {
    return (
        <section id="pricing" className="px-16 pb-20 pt-10">
            <div className="mx-auto max-w-[720px] text-center">
                <h2 className="display mb-5 mt-0 text-[72px]">
                    The goal is small.
                    <br />
                    The friends are the trick.
                </h2>

                <p className="mb-7 text-lg text-ink-2">
                    Always free. Unless it costs too much, then maybe not. It's
                    still open source though, right?
                </p>

                <div className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-card p-1.5 pl-[18px]">
                    <input
                        placeholder="you@inbox.com"
                        className="w-[220px] border-0 bg-transparent text-[15px] font-[inherit] outline-0"
                    />
                    <Link to="/register" className="btn btn-primary">
                        Hold yourself accountable →
                    </Link>
                </div>
            </div>
        </section>
    )
}
