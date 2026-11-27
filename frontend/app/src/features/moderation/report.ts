// Reporting someone for their profile picture or name: a menu of what's wrong,
// a confirmation, then a thank-you. Opened from their member row in a
// competition's settings, or by long-pressing them on a standings row or feed
// card. The server only takes reports about people you share a competition
// with, which is everyone these are opened from.

import { Alert } from "react-native"
import {
    ApiError,
    type ApiConfig,
    type ReportReason,
    reportUser
} from "@shared/index"
import { confirm } from "../../ui/confirm"
import { type MenuAction, showMenu } from "../../ui/menu"

export type ReportTarget = {
    userID: string
    username: string
    /** Absent or null if they have no picture: there's nothing to report then. */
    avatarVersion?: number | null
}

/** The menu choices for reporting [target], to show alone or after others. */
export function reportActions(
    api: ApiConfig,
    target: ReportTarget
): MenuAction[] {
    return [
        ...(target.avatarVersion != null
            ? [
                  {
                      label: "Report profile picture",
                      destructive: true,
                      run: () => void report(api, target, "AVATAR")
                  }
              ]
            : []),
        {
            label: "Report username",
            destructive: true,
            run: () => void report(api, target, "USERNAME")
        }
    ]
}

/** A menu of what to report about [target]. */
export function showReportMenu(api: ApiConfig, target: ReportTarget) {
    showMenu(target.username, reportActions(api, target))
}

async function report(
    api: ApiConfig,
    target: ReportTarget,
    reason: ReportReason
) {
    const what = reason === "AVATAR" ? "profile picture" : "username"
    const ok = await confirm(
        `Report ${target.username}'s ${what}?`,
        `We'll review it and take it down if it breaks the rules. ${target.username} won't know who reported it.`,
        "Report",
        true
    )
    if (!ok) return
    try {
        await reportUser(api, target.userID, reason)
        Alert.alert("Thanks for reporting", "We'll take a look.")
    } catch (err) {
        Alert.alert(
            "Couldn't send the report",
            err instanceof ApiError
                ? err.messages.join(", ")
                : "Check your connection and try again."
        )
    }
}
