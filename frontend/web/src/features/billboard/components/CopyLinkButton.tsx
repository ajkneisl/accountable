// Copies a link that opens the current billboard page on another screen without
// signing in — for a kiosk or TV that can't be logged into.

import { useState } from "react"
import { useLocation } from "react-router-dom"
import { getDisplayToken, useApi } from "@shared/index"
import { displayLink, isDisplaySession } from "../../../auth"

type Status = "idle" | "copied" | "failed"

/**
 * Button that copies this page's read-only display link. The link carries the
 * account's display token, which doesn't expire, so it's set on a kiosk once.
 * Renders nothing on a display itself, which can't mint links.
 */
export function CopyLinkButton() {
    const api = useApi()
    const { pathname } = useLocation()
    const [status, setStatus] = useState<Status>("idle")

    if (isDisplaySession) return null

    const copy = async () => {
        let next: Status = "failed"
        try {
            const { token } = await getDisplayToken(api)
            const link = displayLink(pathname, token)
            try {
                await navigator.clipboard.writeText(link)
            } catch {
                // No clipboard access (e.g. plain http): show it to copy by hand.
                window.prompt("Copy this link", link)
            }
            next = "copied"
        } catch {
            // Couldn't fetch the token; the label says so.
        }
        setStatus(next)
        setTimeout(() => setStatus("idle"), 2000)
    }

    return (
        <button
            type="button"
            onClick={copy}
            title="Copy a read-only link that opens this page without signing in, for a kiosk or TV"
            className="btn btn-line btn-sm"
        >
            {status === "copied"
                ? "Link copied"
                : status === "failed"
                  ? "Couldn\u2019t copy"
                  : "Copy link"}
        </button>
    )
}
