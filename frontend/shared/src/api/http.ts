import { ApiError, readErrorMessages } from "./errors"

/**
 * API Config for {@link request}
 *
 * @param baseUrl The base URL for all requests.
 * @param fetchImpl The fetch function, defined since this is used between react native and react.
 * @param getAccessToken Retrieve the access token.
 * @param onUnauthorized Called when an authorized request is rejected with a 401, with the token
 * that was rejected. Resolve true once a fresh access token is available and the request is
 * retried once; resolve false to surface the 401.
 */
export interface ApiConfig {
    baseUrl: string
    fetchImpl?: typeof fetch
    getAccessToken?: () => string | null
    onUnauthorized?: (rejectedToken: string | null) => Promise<boolean>
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

    const send = (token: string | null) => {
        const headers: Record<string, string> = {}
        if (body !== undefined) headers["Content-Type"] = "application/json"
        if (token) headers["Authorization"] = `Bearer ${token}`

        return fetchImpl(`${baseUrl}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        })
    }

    const token = opts.auth ? (config.getAccessToken?.() ?? null) : null
    let res = await send(token)

    if (res.status === 401 && opts.auth && config.onUnauthorized) {
        if (await config.onUnauthorized(token)) {
            res = await send(config.getAccessToken?.() ?? null)
        }
    }

    if (!res.ok) {
        const messages = await readErrorMessages(res, method, path)
        throw new ApiError(res.status, messages)
    }

    if (opts.expectJson === false) return undefined as T
    return (await res.json()) as T
}
