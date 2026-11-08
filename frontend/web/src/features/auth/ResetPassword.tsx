import { useState, type SubmitEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { resetPassword, useApi } from "@shared/index"
import {
    AuthCard,
    errorMessages,
    FormErrors,
    inputClass,
    labelClass
} from "./AuthCard"

/**
 * Where a reset email's link lands (/reset-password?token=…): choose a new
 * password. Resetting signs the account out everywhere, so it ends by pointing
 * back to sign in.
 */
export default function ResetPassword() {
    const api = useApi()
    const [params] = useSearchParams()
    const token = params.get("token") ?? ""
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault()
        if (password !== confirm) {
            setErrors(["The passwords don't match."])
            return
        }
        setErrors([])
        setSubmitting(true)
        try {
            await resetPassword(api, token, password)
            setDone(true)
        } catch (err) {
            setErrors(errorMessages(err))
        } finally {
            setSubmitting(false)
        }
    }

    if (!token) {
        return (
            <AuthCard title="Link incomplete">
                <p className="mb-0 mt-0 text-sm leading-[1.5] text-ink-2">
                    This reset link is missing part of it. Open the link from
                    the email again, or{" "}
                    <Link to="/forgot-password" className="text-ink underline">
                        ask for a new one
                    </Link>
                    .
                </p>
            </AuthCard>
        )
    }

    if (done) {
        return (
            <AuthCard title="Password updated">
                <p className="mb-0 mt-0 text-sm leading-[1.5] text-ink-2">
                    You've been signed out everywhere. Sign in again with your
                    new password, in the Beacc app or here.
                </p>
                <Link
                    to="/login"
                    className="btn btn-primary mt-[18px] w-full no-underline"
                >
                    Sign in
                </Link>
            </AuthCard>
        )
    }

    return (
        <AuthCard
            title="Choose a new password"
            subtitle="At least 8 characters, with a letter and a number."
        >
            <form onSubmit={onSubmit}>
                <label className={labelClass} htmlFor="password">
                    New password
                </label>
                <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                />
                <label className={labelClass} htmlFor="confirm">
                    Confirm new password
                </label>
                <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputClass}
                />
                <FormErrors errors={errors} />
                <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary mt-[18px] w-full"
                >
                    {submitting ? "Saving…" : "Set password"}
                </button>
                {errors.some((m) => m.includes("expired")) && (
                    <p className="mb-0 mt-5 text-center text-xs text-ink-3">
                        <Link to="/forgot-password" className="text-ink-3">
                            Send a new link
                        </Link>
                    </p>
                )}
            </form>
        </AuthCard>
    )
}
