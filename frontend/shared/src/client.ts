export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface ApiClientOptions {
  baseUrl: string
  fetchImpl?: typeof fetch
  getAccessToken?: () => string | null
}

export interface RequestOptions {
  auth?: boolean
  expectJson?: boolean
}

export class HttpClient {
  readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly getAccessToken: () => string | null

  constructor({ baseUrl, fetchImpl, getAccessToken }: ApiClientOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetchImpl = fetchImpl ?? fetch.bind(globalThis)
    this.getAccessToken = getAccessToken ?? (() => null)
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: RequestOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (opts.auth) {
      const token = this.getAccessToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ApiError(res.status, text || `${method} ${path} failed: ${res.status}`)
    }
    if (opts.expectJson === false) return undefined as T
    return (await res.json()) as T
  }
}
