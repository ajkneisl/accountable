import { Link, useParams } from "react-router-dom"
import { APP_STORE_URL, PLAY_STORE_URL } from "../landing/appStore"
import { LegalPage } from "../legal/LegalPage"

/**
 * Join link landing page, served at /join/:code. With the app installed iOS opens
 * these links straight in Beacc, so this is only seen without it (or on desktop).
 */
export default function Join() {
    const code = (useParams().code ?? "").trim().toUpperCase()

    return (
        <LegalPage title="Join a competition">
            <p>
                You've been invited to a competition on Beacc. Your join code:
            </p>

            <p className="display my-6 text-[40px] tracking-[0.12em] text-ink">
                {code}
            </p>

            <p>
                <a href={`accountable://join/${encodeURIComponent(code)}`}>
                    Open in Beacc
                </a>
            </p>

            <p>
                Don't have the app yet? Get Beacc on the{" "}
                <a href={APP_STORE_URL}>App Store</a> or{" "}
                <a href={PLAY_STORE_URL}>Google Play</a>, then open the
                Competitions tab and join with the code above. See{" "}
                <Link to="/support">Support</Link> if you get stuck.
            </p>
        </LegalPage>
    )
}
