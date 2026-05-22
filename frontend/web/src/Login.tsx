import { useState, type SubmitEvent } from "react"
import { useSetAtom } from "jotai"
import { Link, useNavigate } from "react-router-dom"
import { ApiError, getSelf, login, register, useApi } from "@shared/api"
import { tokenStore, userAtom } from "./auth"
import { AccLogo } from "./design/primitives"

type Mode = "login" | "register"

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--ink-2)",
    marginBottom: 6
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--line)",
    borderRadius: 10,
    padding: "11px 14px",
    font: "inherit",
    fontSize: 14,
    outline: 0,
    color: "var(--ink)",
    background: "var(--bg-card)",
    marginBottom: 14
}

const STATS = [
    { n: "90s", l: "avg setup" },
    { n: "4,210", l: "on track this week" },
    { n: "32", l: "data sources" },
    { n: "free", l: "first 3 friends" }
]

/**
 * Sign-in / registration page — styled to match the onboarding flow.
 */
function Login() {
    const api = useApi()
    const navigate = useNavigate()
    const setUser = useSetAtom(userAtom)
    const [mode, setMode] = useState<Mode>("login")
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault()
        setErrors([])
        setSubmitting(true)
        try {
            const tokens =
                mode === "login"
                    ? await login(api, username, password)
                    : await register(api, username, password, email)
            tokenStore.set(tokens)
            setUser(await getSelf(api))
            navigate("/dashboard")
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.messages)
            else if (err instanceof Error) setErrors([err.message])
            else setErrors(["Something went wrong"])
        } finally {
            setSubmitting(false)
        }
    }

    const isLogin = mode === "login"

    return (
        <div
            className="acc"
            style={{
                width: "100%",
                maxWidth: 1440,
                margin: "0 auto",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "var(--bg)"
            }}
        >
            {/* Top bar */}
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "24px 36px"
                }}
            >
                <Link
                    to="/"
                    style={{ textDecoration: "none", color: "inherit" }}
                >
                    <AccLogo />
                </Link>
                <Link
                    to="/"
                    style={{
                        fontSize: 13,
                        color: "var(--ink-3)",
                        textDecoration: "none"
                    }}
                >
                    ← Back to home
                </Link>
            </header>

            {/* Body — split: prompt + form */}
            <div
                style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    padding: "20px 0 0",
                    alignItems: "stretch"
                }}
            >
                {/* Left — kicker + prompt */}
                <div
                    style={{
                        padding: "40px 36px 40px 88px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                    }}
                >
                    <div className="eyebrow" style={{ marginBottom: 14 }}>
                        {isLogin ? "WELCOME BACK" : "CREATE YOUR ACCOUNT"}
                    </div>
                    <h1
                        className="display"
                        style={{
                            fontSize: 56,
                            margin: "0 0 20px",
                            maxWidth: 560
                        }}
                    >
                        Goals stick when
                        <br />
                        someone&apos;s watching.
                    </h1>
                    <p
                        style={{
                            fontSize: 17,
                            color: "var(--ink-2)",
                            maxWidth: 480,
                            marginBottom: 28,
                            lineHeight: 1.5
                        }}
                    >
                        {isLogin
                            ? "Sign in to check on your goals, your streaks, and whoever is currently losing to you."
                            : "We'll set you up with one goal, one source, and one friend. That's the whole onboarding — about 90 seconds."}
                    </p>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 14,
                            maxWidth: 460
                        }}
                    >
                        {STATS.map((s, i) => (
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
                </div>

                {/* Right — form card */}
                <div
                    style={{
                        padding: "40px 88px 40px 36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    <form
                        onSubmit={onSubmit}
                        className="card"
                        style={{ padding: 32, width: 420 }}
                    >
                        <h2
                            style={{
                                fontSize: 22,
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                margin: "0 0 4px"
                            }}
                        >
                            {isLogin ? "Sign in" : "Create your account"}
                        </h2>
                        <p
                            style={{
                                fontSize: 13,
                                color: "var(--ink-3)",
                                margin: "0 0 22px"
                            }}
                        >
                            {isLogin
                                ? "Welcome back to Accountable."
                                : "One goal, one source, one friend."}
                        </p>

                        <label style={labelStyle}>Username</label>
                        <input
                            type="text"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={inputStyle}
                        />

                        {!isLogin && (
                            <>
                                <label style={labelStyle}>Email</label>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(e.target.value)
                                    }
                                    style={inputStyle}
                                />
                            </>
                        )}

                        <label style={labelStyle}>Password</label>
                        <input
                            type="password"
                            autoComplete={
                                isLogin
                                    ? "current-password"
                                    : "new-password"
                            }
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ ...inputStyle, marginBottom: 6 }}
                        />

                        {errors.length > 0 && (
                            <ul
                                role="alert"
                                style={{
                                    listStyle: "none",
                                    margin: "12px 0 0",
                                    padding: 12,
                                    background: "var(--coral-soft)",
                                    color: "var(--coral-ink)",
                                    borderRadius: 10,
                                    fontSize: 12,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 4
                                }}
                            >
                                {errors.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn btn-primary"
                            style={{ width: "100%", marginTop: 18 }}
                        >
                            {submitting
                                ? "Please wait…"
                                : isLogin
                                  ? "Sign in →"
                                  : "Create account →"}
                        </button>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                margin: "20px 0"
                            }}
                        >
                            <hr className="divider" style={{ flex: 1 }} />
                            <span
                                className="mono"
                                style={{
                                    fontSize: 11,
                                    color: "var(--ink-3)"
                                }}
                            >
                                {isLogin ? "NEW HERE?" : "ALREADY HAVE ONE?"}
                            </span>
                            <hr className="divider" style={{ flex: 1 }} />
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setErrors([])
                                setMode((m) =>
                                    m === "login" ? "register" : "login"
                                )
                            }}
                            className="btn btn-line"
                            style={{ width: "100%" }}
                        >
                            {isLogin
                                ? "Create an account"
                                : "Sign in instead"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <footer
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    padding: "20px 36px 36px"
                }}
            >
                <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                    First time?{" "}
                    <Link
                        to="/onboarding"
                        style={{ color: "var(--ink)" }}
                    >
                        Take the guided setup
                    </Link>
                </span>
            </footer>
        </div>
    )
}

export default Login
