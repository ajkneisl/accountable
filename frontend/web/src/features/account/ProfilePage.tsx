// Profile page — read-only summary of the signed-in user's account.

import { useAtomValue } from "jotai"
import { userAtom } from "../../auth"
import { AccountShell, InfoRow } from "./AccountShell"

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
})

export default function ProfilePage() {
    const user = useAtomValue(userAtom)
    const initial = (user?.username[0] ?? "?").toUpperCase()

    return (
        <AccountShell eyebrow="ACCOUNT" title="Profile">
            <div className="card max-w-[560px] p-6">
                <div className="mb-5 flex items-center gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-lime text-[22px] font-bold text-ink">
                        {initial}
                    </div>
                    <div>
                        <div className="text-[20px] font-bold tracking-[-0.02em]">
                            {user?.username ?? "—"}
                        </div>
                        <div className="text-[13px] text-ink-3">
                            {user?.email ?? "—"}
                        </div>
                    </div>
                </div>

                <InfoRow label="Username" value={user?.username ?? "—"} />
                <InfoRow label="Email" value={user?.email ?? "—"} />
                <InfoRow
                    label="Member since"
                    value={
                        user ? DATE_FMT.format(new Date(user.createdAt)) : "—"
                    }
                />
            </div>
        </AccountShell>
    )
}
