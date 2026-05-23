// Landing closing call-to-action.

import { Link } from "react-router-dom"

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
                    Free to start. No credit card. Bring one friend; the second
                    is on us.
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-card p-1.5 pl-[18px]">
                    <input
                        placeholder="you@inbox.com"
                        className="w-[220px] border-0 bg-transparent text-[15px] font-[inherit] outline-0"
                    />
                    <Link to="/onboarding" className="btn btn-primary">
                        Get my first goal →
                    </Link>
                </div>
            </div>
        </section>
    )
}
