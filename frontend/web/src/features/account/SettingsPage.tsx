// Settings page — account-level settings and the sign-out control.
// Integration-specific configuration lives on each integration's own page.

import { useAtomValue } from "jotai"
import { Link } from "react-router-dom"
import { useSignOut, userAtom } from "../../auth"
import { AccountShell, InfoRow } from "./AccountShell"

export default function SettingsPage() {
    const signOut = useSignOut()
    const user = useAtomValue(userAtom)

    return (
        <AccountShell eyebrow="ACCOUNT" title="Settings">
            <div className="flex max-w-[560px] flex-col gap-4">
                <div className="card p-6">
                    <div className="eyebrow mb-3.5">ACCOUNT</div>
                    <InfoRow label="Username" value={user?.username ?? "—"} />
                    <InfoRow label="Email" value={user?.email ?? "—"} />
                    <div className="mt-4">
                        <Link
                            to="/profile"
                            className="btn btn-line btn-sm no-underline"
                        >
                            View profile
                        </Link>
                    </div>
                </div>

                <div className="card p-6">
                    <div className="eyebrow mb-2">INTEGRATIONS</div>
                    <p className="m-0 text-[13px] text-ink-3">
                        Connect or disconnect data sources from each
                        integration's page — open one from the Integrations list
                        in the sidebar.
                    </p>
                </div>

                <div className="card p-6">
                    <div className="eyebrow mb-2">SESSION</div>
                    <p className="m-0 mb-3.5 text-[13px] text-ink-3">
                        Sign out of Accountable on this device.
                    </p>
                    <button
                        type="button"
                        onClick={signOut}
                        className="btn btn-line btn-sm"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </AccountShell>
    )
}
