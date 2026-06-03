import { useState, type SubmitEvent } from "react"
import { useSetAtom } from "jotai"
import { Link, useNavigate } from "react-router-dom"
import { ApiError, getSelf, login, register, useApi } from "@shared/api"
import { tokenStore, userAtom } from "./auth"
import { AccLogo } from "./features/common/primitives"

type Mode = "login" | "register"

const labelClass = "block text-xs font-medium text-ink-2 mb-1.5"
const inputClass =
    "w-full border border-line rounded-[10px] px-3.5 py-[11px] text-sm outline-0 text-ink bg-bg-card mb-3.5 font-[inherit]"

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
        <div className="acc mx-auto flex min-h-screen w-full max-w-[1440px] flex-col bg-bg">
            {/* Top bar */}
            <header className="flex items-center justify-between px-9 py-6">
                <Link to="/" className="text-inherit no-underline">
                    <AccLogo />
                </Link>
                <Link
                    to="/"
                    className="text-[13px] text-ink-3 no-underline"
                >
            </Link>
                ← Back to home
            </header>

            {/* Body — split: prompt + form */}
            <div className="grid flex-1 grid-cols-2 items-stretch pt-5">
                {/* Left — kicker + prompt */}
                <div className="flex flex-col justify-center py-10 pl-[88px] pr-9">
                    <div className="eyebrow mb-3.5">
                        {isLogin ? "WELCOME BACK" : "CREATE YOUR ACCOUNT"}
                    </div>
                    <h1 className="display mb-5 mt-0 max-w-[560px] text-[56px]">
                        Goals stick when
                        <br />
                        someone&apos;s watching.
                    </h1>
                    <p className="mb-7 max-w-[480px] text-[17px] leading-[1.5] text-ink-2">
                        {isLogin
                            ? "Sign in to check on your goals, your streaks, and whoever is currently losing to you."
                            : "We'll set you up with one goal, one source, and one friend. That's the whole onboarding — about 90 seconds."}
                    </p>
                    <div className="grid max-w-[460px] grid-cols-2 gap-3.5">
                        {STATS.map((s, i) => (
                            <div
                                key={i}
                                className="border-l-2 border-ink bg-bg-card px-3.5 py-3"
                            >
                                <div className="mono text-[22px] font-bold tracking-[-0.02em]">
                                    {s.n}
                                </div>
                                <div className="text-xs text-ink-3">{s.l}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right — form card */}
                <div className="flex items-center justify-center py-10 pl-9 pr-[88px]">
                    <form onSubmit={onSubmit} className="card w-[420px] p-8">
                        <h2 className="mb-1 mt-0 text-[22px] font-bold tracking-[-0.02em]">
                            {isLogin ? "Sign in" : "Create your account"}
                        </h2>
                        <p className="mb-[22px] mt-0 text-[13px] text-ink-3">
                            {isLogin
                                ? "Welcome back to Accountable."
                                : "One goal, one source, one friend."}
                        </p>

                        <label className={labelClass}>Username</label>
                        <input
                            type="text"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={inputClass}
                        />

                        {!isLogin && (
                            <>
                                <label className={labelClass}>Email</label>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                />
                            </>
                        )}

                        <label className={labelClass}>Password</label>
                        <input
                            type="password"
                            autoComplete={
                                isLogin ? "current-password" : "new-password"
                            }
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${inputClass} !mb-1.5`}
                        />

                        {errors.length > 0 && (
                            <ul
                                role="alert"
                                className="mt-3 flex list-none flex-col gap-1 rounded-[10px] bg-coral-soft p-3 text-xs text-coral-ink"
                            >
                                {errors.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn btn-primary mt-[18px] w-full"
                        >
                            {submitting
                                ? "Please wait…"
                                : isLogin
                                  ? "Sign in →"
                                  : "Create account →"}
                        </button>

                        <div className="my-5 flex items-center gap-3">
                            <hr className="divider flex-1" />
                            <span className="mono text-[11px] text-ink-3">
                                {isLogin ? "NEW HERE?" : "ALREADY HAVE ONE?"}
                            </span>
                            <hr className="divider flex-1" />
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setErrors([])
                                setMode((m) =>
                                    m === "login" ? "register" : "login"
                                )
                            }}
                            className="btn btn-line w-full"
                        >
                            {isLogin ? "Create an account" : "Sign in instead"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end px-9 pb-9 pt-5">
                <span className="text-[13px] text-ink-3">
                    First time?{" "}
                    <Link to="/onboarding" className="text-ink">
                        Take the guided setup
                    </Link>
                </span>
            </footer>
        </div>
    )
}

export default Login
