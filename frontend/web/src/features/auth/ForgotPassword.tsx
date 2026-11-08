import { useState, type SubmitEvent } from "react"
import { Link } from "react-router-dom"
import { requestPasswordReset, useApi } from "@shared/index"
import {
    AuthCard,
    errorMessages,
    FormErrors,
    inputClass,
    labelClass
} from "./AuthCard"

/** Asks for a username or email and sends a reset link to the account's address. */
export default function ForgotPassword() {
    const api = useApi()
    const [identifier, setIdentifier] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [sent, setSent] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault()
        setErrors([])
        setSubmitting(true)
        try {
            await requestPasswordReset(api, identifier)
            setSent(true)
        } catch (err) {
            setErrors(errorMessages(err))
        } finally {
            setSubmitting(false)
        }
    }

    if (sent) {
        return (
            <AuthCard title="Check your email">
                <p className="mb-0 mt-0 text-sm leading-[1.5] text-ink-2">
                    If an account matches, we've sent it a link to reset the
                    password. It works for an hour.
                </p>
                <Link
                    to="/login"
                    className="btn btn-primary mt-[18px] w-full no-underline"
                >
                    Back to sign in
                </Link>
            </AuthCard>
        )
    }

    return (
        <AuthCard
            title="Reset your password"
            subtitle="Enter your username or email and we'll send you a link."
        >
            <form onSubmit={onSubmit}>
                <label className={labelClass} htmlFor="identifier">
                    Username or email
                </label>
                <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className={inputClass}
                />
                <FormErrors errors={errors} />
                <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary mt-[18px] w-full"
                >
                    {submitting ? "Sending…" : "Send reset link"}
                </button>
                <p className="mb-0 mt-5 text-center text-xs text-ink-3">
                    <Link to="/login" className="text-ink-3">
                        Back to sign in
                    </Link>
                </p>
            </form>
        </AuthCard>
    )
}
