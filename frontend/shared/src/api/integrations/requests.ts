import { request, type ApiConfig } from "../http"

/**
 * Configuration status of a single integration for the authenticated user.
 */
export interface IntegrationStatus {
    name: string
    enabled: boolean
    externalID: string | null
}

/**
 * A day's integration data plus, for today, when it was last refreshed upstream.
 * `data` is the provider-specific payload and is left untyped here.
 */
export interface IntegrationDayResponse {
    data: unknown
    lastFetched: number | null
}

/** GET /api/integrations — list every supported integration with the user's connection state. */
export function listIntegrations(config: ApiConfig): Promise<IntegrationStatus[]> {
    return request(config, "GET", "/integrations", undefined, { auth: true })
}

/**
 * GET /api/integrations/{name}?date={ms} — fetch a day's data. When {date} is today
 * (the default) and the stored row is missing or stale, the backend refreshes it from
 * upstream before responding.
 */
export function getIntegration(
    config: ApiConfig,
    name: string,
    date: number = Date.now()
): Promise<IntegrationDayResponse> {
    return request(
        config,
        "GET",
        `/integrations/${encodeURIComponent(name)}?date=${date}`,
        undefined,
        { auth: true }
    )
}

/** POST /api/integrations/{name} — link {name} to an upstream account. */
export function enableIntegration(
    config: ApiConfig,
    name: string,
    externalID: string
): Promise<void> {
    return request(
        config,
        "POST",
        `/integrations/${encodeURIComponent(name)}`,
        { externalID },
        { auth: true, expectJson: false }
    )
}

/** DELETE /api/integrations/{name} — disconnect {name}. */
export function disableIntegration(config: ApiConfig, name: string): Promise<void> {
    return request(
        config,
        "DELETE",
        `/integrations/${encodeURIComponent(name)}`,
        undefined,
        { auth: true, expectJson: false }
    )
}
