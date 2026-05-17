import { request, type ApiConfig } from "../http"

/**
 * Response about backend version.
 *
 * @param version The backend's version.
 * @param name Backend version name.
 */
export interface VersionResponse {
    version: string
    name: string
}

/**
 * Retrieve the backend version.
 *
 * @param config API
 */
export function getVersion(config: ApiConfig): Promise<VersionResponse> {
    return request(config, "GET", "/version")
}
