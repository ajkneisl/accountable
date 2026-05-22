// Landing closing call-to-action.

import { Link } from "react-router-dom"

export function CTA() {
    return (
        <section id="pricing" style={{ padding: "40px 64px 80px" }}>
            <div
                style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}
            >
                <h2
                    className="display"
                    style={{ fontSize: 72, margin: "0 0 20px" }}
                >
                    The goal is small.
                    <br />
                    The friends are the trick.
                </h2>
                <p
                    style={{
                        fontSize: 18,
                        color: "var(--ink-2)",
                        marginBottom: 28
                    }}
                >
                    Free to start. No credit card. Bring one friend; the second
                    is on us.
                </p>
                <div
                    style={{
                        display: "inline-flex",
                        gap: 8,
                        alignItems: "center",
                        padding: 6,
                        paddingLeft: 18,
                        borderRadius: 999,
                        background: "var(--bg-card)",
                        border: "1px solid var(--line)"
                    }}
                >
                    <input
                        placeholder="you@inbox.com"
                        style={{
                            border: 0,
                            outline: 0,
                            font: "inherit",
                            fontSize: 15,
                            background: "transparent",
                            width: 220
                        }}
                    />
                    <Link to="/onboarding" className="btn btn-primary">
                        Get my first goal →
                    </Link>
                </div>
            </div>
        </section>
    )
}
