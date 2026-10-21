export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface Endpoint {
  path: string
  method?: HttpMethod
  query?: Record<string, string>
  body?: unknown
  headers?: Record<string, string>
}

/**
 * Corpo de erro da API. O backend devolve sempre este formato, entao vale a
 * pena carrega-lo junto do erro em vez de so o codigo HTTP.
 */
export interface ApiError {
  statusCode: number
  message: string
  error?: string | null
  requestId?: string | null
}

export type NetworkErrorKind =
  | 'invalidURL'
  | 'transport'
  | 'unauthorized'
  | 'notFound'
  | 'server'
  | 'decoding'
  | 'offline'
  | 'noContent'

export class NetworkError extends Error {
  readonly kind: NetworkErrorKind
  readonly status: number | null
  readonly api: ApiError | null

  constructor(
    kind: NetworkErrorKind,
    message: string,
    status: number | null = null,
    api: ApiError | null = null,
  ) {
    super(message)
    this.name = 'NetworkError'
    this.kind = kind
    this.status = status
    this.api = api
  }

  /** Mensagem vinda do servidor, quando existe. */
  get apiMessage(): string | null {
    return this.api?.message ?? null
  }

  get isRetryable(): boolean {
    return this.kind === 'transport' || this.kind === 'offline' || this.kind === 'server'
  }
}

export function buildUrl(baseUrl: string, endpoint: Endpoint): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const path = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`
  const query = endpoint.query ?? {}
  const keys = Object.keys(query).sort()
  if (keys.length === 0) return `${base}${path}`
  const search = keys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key]!)}`)
    .join('&')
  return `${base}${path}?${search}`
}

export interface HttpClient {
  send<Response>(endpoint: Endpoint): Promise<Response>
  sendVoid(endpoint: Endpoint): Promise<void>
}

export function createHttpClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): HttpClient {
  async function perform(endpoint: Endpoint): Promise<{ body: string; status: number }> {
    const url = buildUrl(baseUrl, endpoint)
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...endpoint.headers,
    }
    if (endpoint.body !== undefined) headers['Content-Type'] = 'application/json'

    let response: Response
    try {
      response = await fetchImpl(url, {
        method: endpoint.method ?? 'GET',
        headers,
        body: endpoint.body === undefined ? undefined : JSON.stringify(endpoint.body),
      })
    } catch (cause) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      throw new NetworkError(
        offline ? 'offline' : 'transport',
        cause instanceof Error ? cause.message : 'Falha de transporte',
      )
    }

    const body = await response.text()
    if (response.ok) return { body, status: response.status }

    let api: ApiError | null = null
    try {
      api = JSON.parse(body) as ApiError
    } catch {
      api = null
    }

    const message = api?.message ?? `HTTP ${response.status}`
    if (response.status === 401 || response.status === 403) {
      throw new NetworkError('unauthorized', message, response.status, api)
    }
    if (response.status === 404) {
      throw new NetworkError('notFound', message, response.status, api)
    }
    throw new NetworkError('server', message, response.status, api)
  }

  return {
    async send<Response>(endpoint: Endpoint): Promise<Response> {
      const { body, status } = await perform(endpoint)
      if (status === 204 || body === '') {
        throw new NetworkError('noContent', 'Resposta sem corpo', status)
      }
      try {
        return JSON.parse(body) as Response
      } catch (cause) {
        throw new NetworkError(
          'decoding',
          cause instanceof Error ? cause.message : 'Falha ao decodificar',
          status,
        )
      }
    },

    async sendVoid(endpoint: Endpoint): Promise<void> {
      await perform(endpoint)
    },
  }
}
