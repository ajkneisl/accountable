import { Link } from "react-router-dom"
import { ContactLink, LegalPage } from "./LegalPage"

/** Privacy policy, served at /privacy. */
export default function Privacy() {
    return (
        <LegalPage title="Privacy Policy" updated="October 26, 2026">
            <p>
                Beacc tracks your goals from the apps you already use and lets
                you compete with friends. This policy explains what we collect
                to do that, who can see it, and how to get rid of it. The short
                version: we collect only what the app needs, we never sell your
                data, and we don't use it for advertising.
            </p>

            <h2>What we collect</h2>
            <p>
                <strong>Your account.</strong> Your username, email address, a
                one-way hash of your password (we never store the password
                itself), your timezone, and the color you pick for competitions.
            </p>
            <p>
                <strong>Health and fitness data.</strong> If you connect Apple
                Health, the app reads only what your goals need and sends us
                daily summaries: your step count, minutes asleep, and workouts
                (when each happened, how long it lasted, and calories burned).
                You choose which categories to allow, and you can revoke access
                at any time in the Health app.
            </p>
            <p>
                <strong>Screen Time.</strong> If you set a Screen Time goal, the
                app sends us your total screen time for each day. We don't
                receive which apps or websites you used.
            </p>
            <p>
                <strong>GitHub and LeetCode.</strong> If you link these, you give
                us your public username. We use it to look up your public
                activity (commit counts and solved problems) from GitHub and
                LeetCode. We don't ask for access to your accounts or any
                private data.
            </p>
            <p>
                <strong>What you create.</strong> Your goals, habits and the
                days you check them off, your streak, and the competitions you
                create or join.
            </p>
            <p>
                <strong>Notifications.</strong> If you allow notifications, we
                store your device's push token so we can send them, along with
                which kinds you've turned off.
            </p>
            <p>
                We don't use third-party analytics, advertising, or tracking
                tools, and the website doesn't use tracking cookies. It keeps
                your sign-in on your own device so you stay signed in.
            </p>

            <h2>How we use it</h2>
            <ul>
                <li>To track progress on your goals, habits and streak.</li>
                <li>To rank you and show your progress in competitions you join.</li>
                <li>To send the notifications you've allowed.</li>
                <li>To keep your account secure and the service running.</li>
            </ul>
            <p>
                Health and Screen Time data is used only to provide these
                features. It is never used for advertising, never sold, and
                never shared with data brokers.
            </p>

            <h2>Who can see it</h2>
            <p>
                <strong>Members of your competitions.</strong> When you join a
                competition, the other members can see your username, color,
                streak, and your progress on that competition's shared goals.
                They don't see your other goals, your habits, or your raw
                health data. Leaving a competition stops sharing with it.
            </p>
            <p>
                <strong>Service providers.</strong> We host Beacc on Amazon Web
                Services and send notifications through Apple's Push
                Notification service. They process data only to run those
                services for us.
            </p>
            <p>
                <strong>When required.</strong> We may disclose information if
                the law requires it, or to protect the safety of our users or
                the service.
            </p>
            <p>That's it. We don't sell or rent your personal information.</p>

            <h2>How long we keep it</h2>
            <p>
                We keep your data for as long as you have an account. When you
                delete your account, your profile, goals, habits, health and
                activity data, devices, competition memberships and any
                competitions you own are permanently deleted from our database.
                Copies may remain in encrypted backups for a limited time
                until they expire.
            </p>

            <h2>Your choices</h2>
            <ul>
                <li>
                    <strong>Delete your account</strong> at any time in the
                    app's Settings. This permanently removes your data.
                </li>
                <li>
                    <strong>Change your email or password</strong> in Settings.
                </li>
                <li>
                    <strong>Revoke Health access</strong> in the Health app, and
                    turn off notifications in Settings or iOS Settings.
                </li>
                <li>
                    <strong>Ask for a copy</strong> of your data, or for a
                    correction, by emailing <ContactLink />.
                </li>
            </ul>
            <p>
                Depending on where you live, you may have further rights over
                your data, such as to object to how it's used or to complain to
                a data protection authority. Email us and we'll help.
            </p>

            <h2>Security</h2>
            <p>
                Data travels over encrypted connections, passwords are hashed
                with bcrypt, and sign-in sessions expire and can be revoked. No
                system is perfectly secure, but we work to protect your
                information.
            </p>

            <h2>Children</h2>
            <p>
                Beacc isn't meant for children under 13, and we don't knowingly
                collect their data. If you believe a child has made an account,
                email us and we'll delete it.
            </p>

            <h2>Changes</h2>
            <p>
                If we change this policy, we'll update the date above. For
                significant changes, we'll let you know in the app before they
                take effect.
            </p>

            <h2>Contact</h2>
            <p>
                Questions about your privacy? Email <ContactLink />. See also
                our <Link to="/tos">Terms of Service</Link>.
            </p>
        </LegalPage>
    )
}
