export interface VersionResponse {
  version: string
  name: string
}

export interface ApiClientOptions {
  baseUrl: string
  fetchImpl?: typeof fetch
}

export class ApiClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor({ baseUrl, fetchImpl }: ApiClientOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetchImpl = fetchImpl ?? fetch
  }

  async getVersion(): Promise<VersionResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/version`)
    if (!res.ok) throw new Error(`GET /version failed: ${res.status}`)
    return (await res.json()) as VersionResponse
  }
}
