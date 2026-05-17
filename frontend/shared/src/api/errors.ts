export class ApiError extends Error {
    readonly status: number
    readonly messages: string[]

    constructor(status: number, messages: string[]) {
        super(messages.join("\n") || `Request failed: ${status}`)
        this.name = "ApiError"
        this.status = status
        this.messages = messages
    }
}

export async function readErrorMessages(
    res: Response,
    method: string,
    path: string
): Promise<string[]> {
    const fallback = [`${method} ${path} failed: ${res.status}`]
    const text = await res.text().catch(() => "")
    if (!text) return fallback

    try {
        const parsed = JSON.parse(text) as {
            message?: unknown
            messages?: unknown
        }
        if (Array.isArray(parsed.messages)) {
            const messages = parsed.messages.filter(
                (m): m is string => typeof m === "string"
            )
            if (messages.length > 0) return messages
        }
        if (typeof parsed.message === "string" && parsed.message.length > 0) {
            return [parsed.message]
        }
        return fallback
    } catch {
        return [text]
    }
}
