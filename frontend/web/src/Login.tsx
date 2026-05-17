import { useState, type FormEvent } from "react"
import { useSetAtom } from "jotai"
import { ApiError, getSelf, login, register, useApi } from "@shared/index"
import { tokenStore, userAtom } from "./auth"

type Mode = "login" | "register"

function Login() {
    const api = useApi()
    const setUser = useSetAtom(userAtom)
    const [mode, setMode] = useState<Mode>("login")
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function onSubmit(e: FormEvent) {
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
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.messages)
            else if (err instanceof Error) setErrors([err.message])
            else setErrors(["Something went wrong"])
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
            <form
                onSubmit={onSubmit}
                className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm flex flex-col gap-4"
            >
                <header className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {mode === "login" ? "Sign in" : "Create account"}
                    </h1>
                    <p className="text-sm text-zinc-500">
                        {mode === "login"
                            ? "Welcome back to accountable."
                            : "Get started with accountable."}
                    </p>
                </header>

                <label className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                        Username
                    </span>
                    <input
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </label>

                {mode === "register" && (
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">
                            Email
                        </span>
                        <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </label>
                )}

                <label className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                        Password
                    </span>
                    <input
                        type="password"
                        autoComplete={
                            mode === "login"
                                ? "current-password"
                                : "new-password"
                        }
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </label>

                {errors.length > 0 && (
                    <ul
                        className="text-sm text-red-600 dark:text-red-400 flex flex-col gap-1"
                        role="alert"
                    >
                        {errors.map((msg, i) => (
                            <li key={i}>{msg}</li>
                        ))}
                    </ul>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-500 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting
                        ? "Please wait…"
                        : mode === "login"
                          ? "Sign in"
                          : "Create account"}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setErrors([])
                        setMode((m) => (m === "login" ? "register" : "login"))
                    }}
                    className="text-sm text-indigo-600 hover:underline self-center"
                >
                    {mode === "login"
                        ? "Don't have an account? Register"
                        : "Already have an account? Sign in"}
                </button>
            </form>
        </main>
    )
}

export default Login
