import { request, type ApiConfig } from "../http"

/**
 * Configuration status of a single integration for the authenticated user.
 */
export interface IntegrationStatus {
    name: string
    enabled: boolean
    externalID: string | null
}

/** GET /api/integrations — list every supported integration with the user's connection state. */
export function listIntegrations(config: ApiConfig): Promise<IntegrationStatus[]> {
    return request(config, "GET", "/integrations", undefined, { auth: true })
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
