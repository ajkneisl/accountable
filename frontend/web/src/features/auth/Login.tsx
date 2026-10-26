import { useState, type SubmitEvent } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { ApiError, getSelf, login, syncTimezone, useApi } from "@shared/index"
import { tokenStore, userAtom } from "../../auth"
import { LogoLink } from "../common/primitives"

const labelClass = "block text-xs font-medium text-ink-2 mb-1.5"
const inputClass =
    "w-full border border-line rounded-[10px] px-3.5 py-[11px] text-sm outline-0 text-ink bg-bg-card mb-3.5 font-[inherit]"

/** Where to go after signing in: the `next` param when it's a local path, else the billboard. */
function nextPath(params: URLSearchParams): string {
    const next = params.get("next")
    return next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/billboard"
}

/**
 * Sign-in page. Accounts are created in the app; the website only signs in to
 * view the billboard.
 */
export default function Login() {
    const api = useApi()
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const user = useAtomValue(userAtom)
    const setUser = useSetAtom(userAtom)
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    if (user && !submitting) return <Navigate to={nextPath(params)} replace />

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
            navigate(nextPath(params), { replace: true })
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
            <header className="flex items-center justify-between px-6 py-6 md:px-9">
                <LogoLink />
                <Link to="/" className="text-[13px] text-ink-3 no-underline">
                    ← Back to home
                </Link>
            </header>

            <div className="grid flex-1 grid-cols-1 items-stretch pt-5 md:grid-cols-2">
                <div className="flex flex-col justify-center px-6 py-10 md:pl-[88px] md:pr-9">
                    <h1 className="display mb-5 mt-0 max-w-[560px] text-[44px] leading-[1.08] md:text-[56px]">
                        Put your goals somewhere{" "}
                        <span className="underline decoration-lime decoration-[6px] underline-offset-[6px]">
                            everyone
                        </span>{" "}
                        can see them.
                    </h1>

                    <p className="mb-7 max-w-[480px] text-[17px] leading-[1.5] text-ink-2">
                        Sign in and view your goals, habits, and competitions.
                    </p>
                </div>

                <div className="flex items-center justify-center px-6 py-10 md:pl-9 md:pr-[88px]">
                    <form
                        onSubmit={onSubmit}
                        className="card w-full max-w-[420px] p-8"
                    >
                        <h2 className="mb-1 mt-0 text-[22px] font-bold tracking-[-0.02em]">
                            Sign in
                        </h2>
                        <p className="mb-[22px] mt-0 text-[13px] text-ink-3">
                            Use the account from the Beacc app.
                        </p>

                        <label className={labelClass} htmlFor="username">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={inputClass}
                        />

                        <label className={labelClass} htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            required
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

                        <p className="mb-0 mt-5 text-center text-xs text-ink-3">
                            New here? Create an account in the Beacc app.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
