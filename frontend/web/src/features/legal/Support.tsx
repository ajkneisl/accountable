import { Link } from "react-router-dom"
import { ContactLink, LegalPage } from "./LegalPage"

/** Support page, served at /support. */
export default function Support() {
    return (
        <LegalPage title="Support">
            <p>
                Something not working, or have an idea? Email <ContactLink />{" "}
                and we'll get back to you, usually within a couple of days.
                Include your username and what device you're on.
            </p>

            <h2>My steps, sleep or workouts aren't updating</h2>
            <p>
                Open the Health app, go to Sharing → Apps → Beacc, and make sure
                the categories your goals use are turned on. Then open Beacc to
                sync. Data recorded by a watch or another app only reaches
                Beacc once it's in Apple Health.
            </p>

            <h2>My Screen Time goal shows nothing</h2>
            <p>
                Screen Time needs permission from iOS. Open the goal in Beacc
                and grant access when asked, or check Settings → Screen Time on
                your iPhone.
            </p>

            <h2>GitHub or LeetCode isn't counting</h2>
            <p>
                Check that you linked the right public username. Only public
                activity counts, so private GitHub contributions won't show.
                Counts refresh periodically and can lag by a little while.
            </p>

            <h2>How do I join a competition?</h2>
            <p>
                Ask the owner for the competition's code, then open the
                Competitions tab and join with it. Owners can reset the code at
                any time, which stops the old one from working.
            </p>

            <h2>I forgot my password</h2>
            <p>
                Email <ContactLink /> from the address on your account and we'll
                help you get back in. If you're signed in, you can change your
                password in Settings.
            </p>

            <h2>How do I delete my account?</h2>
            <p>
                In the app, go to Settings and choose Delete account. This
                permanently removes your data and any competitions you own. See
                the <Link to="/privacy">Privacy Policy</Link> for details.
            </p>

            <h2>Legal</h2>
            <p>
                <Link to="/privacy">Privacy Policy</Link> ·{" "}
                <Link to="/tos">Terms of Service</Link>
            </p>
        </LegalPage>
    )
}
