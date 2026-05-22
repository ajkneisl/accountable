// Onboarding step 01 — account creation.

import { Link } from "react-router-dom"
import { inputStyle, labelStyle } from "../styles"
import { OnbShell } from "./OnbShell"

export function StepSignup({ next }: { next: () => void }) {
    const side = (
        <div className="card" style={{ padding: 32, width: 420 }}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginBottom: 22
                }}
            >
                <button
                    className="btn btn-line"
                    style={{
                        justifyContent: "flex-start",
                        padding: "12px 16px"
                    }}
                >
                    <span
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: "var(--ink)",
                            color: "var(--bg)",
                            display: "inline-grid",
                            placeItems: "center",
                            fontSize: 11,
                            fontWeight: 700
                        }}
                    >

                    </span>
                    Continue with Apple
                </button>
                <button
                    className="btn btn-line"
                    style={{
                        justifyContent: "flex-start",
                        padding: "12px 16px"
                    }}
                >
                    <span
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background:
                                "conic-gradient(from 0deg, #ea4335, #fbbc04, #34a853, #4285f4, #ea4335)"
                        }}
                    />
                    Continue with Google
                </button>
                <button
                    className="btn btn-line"
                    style={{
                        justifyContent: "flex-start",
                        padding: "12px 16px"
                    }}
                >
                    <span
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: "var(--ink)",
                            color: "var(--bg)",
                            display: "inline-grid",
                            placeItems: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: "Geist Mono"
                        }}
                    >
                        GH
                    </span>
                    Continue with GitHub
                </button>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 18
                }}
            >
                <hr className="divider" style={{ flex: 1 }} />
                <span
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-3)" }}
                >
                    OR EMAIL
                </span>
                <hr className="divider" style={{ flex: 1 }} />
            </div>

            <label style={labelStyle}>Your name</label>
            <input defaultValue="Lukas Kroon" style={inputStyle} />

            <label style={labelStyle}>Email</label>
            <input defaultValue="lukas@kroon.work" style={inputStyle} />

            <label style={labelStyle}>Pick a username</label>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "11px 14px",
                    marginBottom: 6
                }}
            >
                <span
                    style={{
                        color: "var(--ink-3)",
                        fontSize: 14,
                        marginRight: 2
                    }}
                >
                    accountable.so/
                </span>
                <input
                    defaultValue="lukas-k"
                    style={{
                        flex: 1,
                        border: 0,
                        font: "inherit",
                        fontSize: 14,
                        fontWeight: 600,
                        outline: 0,
                        background: "transparent",
                        color: "var(--ink)"
                    }}
                />
                <span
                    style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--lime)",
                        color: "var(--ink)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 700
                    }}
                >
                    ✓
                </span>
            </div>
            <div
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)" }}
            >
                available · friends find you here
            </div>
        </div>
    )

    return (
        <OnbShell
            step={1}
            kicker="01 · CREATE YOUR ACCOUNT"
            title={
                <>
                    Goals stick when
                    <br />
                    someone&apos;s watching.
                </>
            }
            side={side}
            footer={
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16
                    }}
                >
                    <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                        Already have one?{" "}
                        <Link to="/login" style={{ color: "var(--ink)" }}>
                            Sign in
                        </Link>
                    </span>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={next}
                    >
                        Continue →
                    </button>
                </div>
            }
        >
            <p
                style={{
                    fontSize: 17,
                    color: "var(--ink-2)",
                    maxWidth: 480,
                    marginBottom: 28,
                    lineHeight: 1.5
                }}
            >
                We&apos;ll set you up with one goal, one source, and one friend.
                That&apos;s the whole onboarding. Should take about 90 seconds.
            </p>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                    maxWidth: 460
                }}
            >
                {[
                    { n: "90s", l: "avg setup" },
                    { n: "4,210", l: "on track this week" },
                    { n: "32", l: "data sources" },
                    { n: "free", l: "first 3 friends" }
                ].map((s, i) => (
                    <div
                        key={i}
                        style={{
                            padding: "12px 14px",
                            borderLeft: "2px solid var(--ink)",
                            background: "var(--bg-card)"
                        }}
                    >
                        <div
                            className="mono"
                            style={{
                                fontSize: 22,
                                fontWeight: 700,
                                letterSpacing: "-0.02em"
                            }}
                        >
                            {s.n}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--ink-3)"
                            }}
                        >
                            {s.l}
                        </div>
                    </div>
                ))}
            </div>
        </OnbShell>
    )
}
