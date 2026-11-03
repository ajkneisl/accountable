import { Link, useParams } from "react-router-dom"
import { LegalPage } from "../legal/LegalPage"

const APP_STORE_URL = "https://apps.apple.com/us/app/beacc/id6825988118"

/**
 * Join link landing page, served at /join/:code. With the app installed iOS opens
 * these links straight in Beacc, so this is only seen without it (or on desktop).
 */
export default function Join() {
    const code = (useParams().code ?? "").trim().toUpperCase()

    return (
        <LegalPage title="Join a competition">
            <p>You've been invited to a competition on Beacc. Your join code:</p>

            <p className="display my-6 text-[40px] tracking-[0.12em] text-ink">
                {code}
            </p>

            <p>
                <a href={`accountable://join/${encodeURIComponent(code)}`}>
                    Open in Beacc
                </a>
            </p>

            <p>
                Don't have the app yet?{" "}
                <a href={APP_STORE_URL}>Get Beacc on the App Store</a>, then
                open the Competitions tab and join with the code above. See{" "}
                <Link to="/support">Support</Link> if you get stuck.
            </p>
        </LegalPage>
    )
}
