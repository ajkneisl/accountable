import { Link } from "react-router-dom"
import { ContactLink, LegalPage } from "./LegalPage"

/** Terms of service, served at /tos. */
export default function Terms() {
    return (
        <LegalPage title="Terms of Service" updated="October 26, 2026">
            <p>
                These terms cover your use of the Beacc app and website
                (together, "Beacc"). By creating an account or using Beacc, you
                agree to them. If you don't agree, please don't use Beacc.
            </p>

            <h2>Your account</h2>
            <ul>
                <li>You must be at least 13 years old to use Beacc.</li>
                <li>
                    Give accurate information when you sign up, and keep your
                    password to yourself. You're responsible for what happens
                    on your account.
                </li>
                <li>
                    Only link GitHub or LeetCode accounts that are yours.
                </li>
            </ul>

            <h2>Competitions and what you share</h2>
            <p>
                When you join a competition, its members see your username,
                color, streak and progress on its shared goals, as described in
                our <Link to="/privacy">Privacy Policy</Link>. The owner of a
                competition can change its goals, remove members, or hand it to
                someone else.
            </p>
            <p>
                You keep ownership of anything you create in Beacc, like goal,
                habit and competition names. You give us permission to store
                and display it as needed to run the service.
            </p>

            <h2>Acceptable use</h2>
            <p>Don't:</p>
            <ul>
                <li>
                    Use offensive, hateful or impersonating usernames or
                    competition names, or harass other users.
                </li>
                <li>
                    Interfere with the service, try to access other people's
                    accounts or data, or probe our systems without permission.
                </li>
                <li>
                    Scrape, overload, or automate access to Beacc beyond normal
                    use of the app and website.
                </li>
                <li>Use Beacc for anything illegal.</li>
            </ul>
            <p>
                We may remove content or suspend accounts that break these
                rules.
            </p>

            <h2>Not medical advice</h2>
            <p>
                Beacc helps you track goals like steps, sleep and workouts. It
                isn't a medical device and doesn't provide medical advice. Talk
                to a doctor before starting a new fitness routine, and don't
                rely on Beacc's numbers for health decisions. Data comes from
                Apple Health, Screen Time, GitHub and LeetCode, and we can't
                guarantee it's complete or accurate.
            </p>

            <h2>Third-party services</h2>
            <p>
                Some features depend on services we don't control, like Apple
                Health, GitHub and LeetCode. Your use of them is governed by
                their own terms, and a feature may stop working if they change.
            </p>

            <h2>Changes and availability</h2>
            <p>
                We're a small team, and Beacc may change over time. We may add
                or remove features, and we may stop offering the service. If we
                shut Beacc down, we'll give reasonable notice when we can.
            </p>
            <p>
                If we change these terms, we'll update the date above. For
                significant changes, we'll let you know in the app. Continuing
                to use Beacc after a change means you accept the new terms.
            </p>

            <h2>Ending your account</h2>
            <p>
                You can delete your account at any time in the app's Settings.
                We may suspend or close accounts that break these terms.
            </p>

            <h2>Disclaimers</h2>
            <p>
                Beacc is provided "as is" and "as available", without
                warranties of any kind, including that it will be
                uninterrupted, error-free or fit for a particular purpose.
            </p>

            <h2>Limitation of liability</h2>
            <p>
                To the fullest extent the law allows, Beacc and its creators
                aren't liable for indirect, incidental, special or
                consequential damages, or for lost data, arising from your use
                of Beacc. Beacc is free, and our total liability for any claim
                is limited to $50. Some places don't allow these limits, so
                they may not apply to you.
            </p>

            <h2>Apple</h2>
            <p>
                If you got Beacc from the App Store, these terms are between
                you and us, not Apple. Apple isn't responsible for Beacc or its
                support, and Apple's standard end-user license agreement also
                applies.
            </p>

            <h2>Contact</h2>
            <p>
                Questions about these terms? Email <ContactLink />.
            </p>
        </LegalPage>
    )
}
