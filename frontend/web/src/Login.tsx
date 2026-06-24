import { useState, type SubmitEvent } from "react"
import { useSetAtom } from "jotai"
import { Link, useNavigate } from "react-router-dom"
import { ApiError, getSelf, login, syncTimezone, useApi } from "@shared/api"
import { tokenStore, userAtom } from "./auth"
import { LogoLink } from "./features/common/primitives"

const labelClass = "block text-xs font-medium text-ink-2 mb-1.5"
const inputClass =
    "w-full border border-line rounded-[10px] px-3.5 py-[11px] text-sm outline-0 text-ink bg-bg-card mb-3.5 font-[inherit]"

/**
 * Sign-in page. New users create an account on the /register page,
 * which is launched from the "Create an account" button.
 */
function Login() {
    const api = useApi()
    const navigate = useNavigate()
    const setUser = useSetAtom(userAtom)
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault()
        setErrors([])
        setSubmitting(true)
        try {
            const tokens = await login(api, username, password)
            tokenStore.set(tokens)
            const me = await getSelf(api)
            setUser(me)
            await syncTimezone(api, me.timezone)
            navigate("/dashboard")
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.messages)
            else if (err instanceof Error) setErrors([err.message])
            else setErrors(["Something went wrong"])
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="acc mx-auto flex w-full max-w-[1440px] flex-1 flex-col bg-bg">
            {/* Top bar */}
            <header className="flex items-center justify-between px-9 py-6">
                <LogoLink />
                <Link to="/" className="text-[13px] text-ink-3 no-underline">
                    ← Back to home
                </Link>
            </header>

            {/* Body — split: prompt + form */}
            <div className="grid flex-1 grid-cols-2 items-stretch pt-5">
                {/* Left — kicker + prompt */}
                <div className="flex flex-col justify-center py-10 pl-[88px] pr-9">
                     <div className="eyebrow mb-3.5">WELCOME BACK</div>

                    <h1 className="display mb-5 mt-0 max-w-[560px] text-[56px]">
                        Goals stick when
                        <br />
                        someone&apos;s{" "}
                        <span className="underline decoration-lime decoration-[6px] underline-offset-[6px]">
                            watching.
                        </span>
                    </h1>

                    <p className="mb-7 max-w-[480px] text-[17px] leading-[1.5] text-ink-2">
                        Sign in to check on your goals, your streaks, and whoever
                        is currently losing to you.
                    </p>
                </div>

                {/* Right — form card */}
                <div className="flex items-center justify-center py-10 pl-9 pr-[88px]">
                    <form onSubmit={onSubmit} className="card w-[420px] p-8">
                        <h2 className="mb-1 mt-0 text-[22px] font-bold tracking-[-0.02em]">
                            Sign in
                        </h2>
                        <p className="mb-[22px] mt-0 text-[13px] text-ink-3">
                            Welcome back to Accountable.
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

                        <label className={labelClass}>Password</label>
                        <input
                            type="password"
                            autoComplete="current-password"
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
                            {submitting ? "Please wait…" : "Sign in →"}
                        </button>

                        <div className="my-5 flex items-center gap-3">
                            <hr className="divider flex-1" />
                            <span className="mono text-[11px] text-ink-3">
                                NEW HERE?
                            </span>
                            <hr className="divider flex-1" />
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/register")}
                            className="btn btn-line w-full"
                        >
                            Create an account
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Login
