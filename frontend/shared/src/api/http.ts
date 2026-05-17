import { ApiError, readErrorMessages } from "./errors"

/**
 * API Config for {@link request}
 *
 * @param baseUrl The base URL for all requests.
 * @param fetchImpl The fetch function, defined since this is used between react native and react.
 * @param getAccessToken Retrieve the access token.
 */
export interface ApiConfig {
    baseUrl: string
    fetchImpl?: typeof fetch
    getAccessToken?: () => string | null
}

/**
 * Request options for {@link request}.
 *
 * @param auth If the endpoint is authorized.
 * @param expectJson If the response is expected to be JSON.
 */
export interface RequestOptions {
    auth?: boolean
    expectJson?: boolean
}

/**
 * Perform an API request.
 *
 * @param config The API config.
 * @param method The method (GET, POST, etc)
 * @param path The path of the request NOT including the base URL.
 * @param body The body of the request, likely JSON.
 * @param opts Other request options.
 */
export async function request<T>(
    config: ApiConfig,
    method: string,
    path: string,
    body?: unknown,
    opts: RequestOptions = {}
): Promise<T> {
    const baseUrl = config.baseUrl.replace(/\/$/, "")
    const fetchImpl = config.fetchImpl ?? fetch.bind(globalThis)

    const headers: Record<string, string> = {}
    if (body !== undefined) headers["Content-Type"] = "application/json"
    if (opts.auth) {
        const token = config.getAccessToken?.() ?? null
        if (token) headers["Authorization"] = `Bearer ${token}`
    }

    const res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    })

    if (!res.ok) {
        const messages = await readErrorMessages(res, method, path)
        throw new ApiError(res.status, messages)
    }

    if (opts.expectJson === false) return undefined as T
    return (await res.json()) as T
}
