export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface Endpoint {
  path: string
  method?: HttpMethod
  query?: Record<string, string>
  body?: unknown
  headers?: Record<string, string>
  /**
   * Rota marcada com cadeado no contrato: leva `Authorization: Bearer` com o
   * token da sessao. Sem token guardado, a requisicao sai sem o cabecalho e o
   * servidor responde 401.
   */
  authenticated?: boolean
  /** A rota confere a senha atual: 401 e senha errada, nao sessao vencida. */
  checksPassword?: boolean
}

/**
 * Corpo de erro da API (contrato v2, secao 1). Todo erro traz pelo menos
 * `status` e `message`; os campos padrao do Spring podem vir junto.
 */
export interface ApiError {
  status: number
  message: string
  error?: string | null
  path?: string | null
  timestamp?: string | null
}

export type NetworkErrorKind =
  | 'invalidURL'
  | 'transport'
  | 'offline'
  /** 400: corpo ou parametro invalido. */
  | 'badRequest'
  /** 401: sem token, token vencido ou senha errada. A sessao acabou. */
  | 'unauthorized'
  /** 403: autenticado, mas sem permissao para aquilo. */
  | 'forbidden'
  | 'notFound'
  /** 409: e-mail ja cadastrado, sem vagas, estado que nao permite a acao. */
  | 'conflict'
  /** 429: login bloqueado depois de 5 senhas erradas seguidas. */
  | 'tooManyAttempts'
  | 'server'
  | 'decoding'
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

  /** Mensagem vinda do servidor, quando existe. Vem em portugues, pronta para a tela. */
  get apiMessage(): string | null {
    const message = this.api?.message ?? ''
    return message === '' ? null : message
  }

  get isRetryable(): boolean {
    if (this.kind === 'transport' || this.kind === 'offline') return true
    return this.kind === 'server' && (this.status === null || this.status >= 500)
  }
}

export function kindForStatus(status: number): NetworkErrorKind {
  switch (status) {
    case 400:
    case 422:
      return 'badRequest'
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'notFound'
    case 409:
      return 'conflict'
    case 429:
      return 'tooManyAttempts'
    default:
      return 'server'
  }
}

export function buildUrl(baseUrl: string, endpoint: Endpoint): string {
  if (/^https?:\/\//i.test(endpoint.path)) {
    const url = new URL(endpoint.path)
    for (const key of Object.keys(endpoint.query ?? {}).sort()) {
      url.searchParams.set(key, endpoint.query![key]!)
    }
    return url.toString()
  }
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

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

export interface HttpClient {
  send<Response>(endpoint: Endpoint): Promise<Response>
  sendWithStatus<Response>(endpoint: Endpoint): Promise<{ data: Response; status: number }>
  /** Para rotas que podem responder 201 sem corpo: devolve null nesse caso. */
  sendOptional<Response>(endpoint: Endpoint): Promise<Response | null>
  sendVoid(endpoint: Endpoint): Promise<void>
}

export interface HttpClientOptions {
  /** Token da sessao, lido a cada requisicao autenticada. */
  getToken?: () => string | null
  /** Chamado quando uma rota autenticada responde 401: a sessao venceu. */
  onUnauthorized?: () => void
}

function parseApiError(body: string, status: number): ApiError | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const raw = parsed as Partial<ApiError>
  // O Spring, quando nao manda `message`, devolve so `error` com a frase
  // padrao do status. A mensagem fica vazia e a tela usa o texto dela.
  return {
    ...raw,
    status: typeof raw.status === 'number' ? raw.status : status,
    message: typeof raw.message === 'string' ? raw.message : '',
  }
}

export function createHttpClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
  options: HttpClientOptions = {},
): HttpClient {
  async function perform(endpoint: Endpoint): Promise<{ body: string; status: number }> {
    const url = buildUrl(baseUrl, endpoint)
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (endpoint.authenticated) {
      const token = options.getToken?.() ?? null
      if (token !== null && token !== '') Object.assign(headers, bearer(token))
    }
    Object.assign(headers, endpoint.headers)
    // FormData vai como esta: o navegador monta o multipart e o boundary.
    const isForm = typeof FormData !== 'undefined' && endpoint.body instanceof FormData
    if (endpoint.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
    const payload: BodyInit | undefined =
      endpoint.body === undefined
        ? undefined
        : isForm
          ? (endpoint.body as FormData)
          : JSON.stringify(endpoint.body)

    let response: Response
    try {
      response = await fetchImpl(url, {
        method: endpoint.method ?? 'GET',
        headers,
        body: payload,
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

    const api = parseApiError(body, response.status)
    const message = api?.message || `HTTP ${response.status}`
    const kind = kindForStatus(response.status)
    if (kind === 'unauthorized' && endpoint.authenticated && !endpoint.checksPassword) {
      options.onUnauthorized?.()
    }
    throw new NetworkError(kind, message, response.status, api)
  }

  function decode<Response>(body: string, status: number): Response {
    try {
      return JSON.parse(body) as Response
    } catch (cause) {
      throw new NetworkError(
        'decoding',
        cause instanceof Error ? cause.message : 'Falha ao decodificar',
        status,
      )
    }
  }

  return {
    async send<Response>(endpoint: Endpoint): Promise<Response> {
      const { body, status } = await perform(endpoint)
      if (status === 204 || body === '') {
        throw new NetworkError('noContent', 'Resposta sem corpo', status)
      }
      return decode<Response>(body, status)
    },

    async sendWithStatus<Response>(endpoint: Endpoint): Promise<{ data: Response; status: number }> {
      const { body, status } = await perform(endpoint)
      if (status === 204 || body === '') {
        throw new NetworkError('noContent', 'Resposta sem corpo', status)
      }
      return { data: decode<Response>(body, status), status }
    },

    async sendOptional<Response>(endpoint: Endpoint): Promise<Response | null> {
      const { body, status } = await perform(endpoint)
      if (status === 204 || body === '') return null
      return decode<Response>(body, status)
    },

    async sendVoid(endpoint: Endpoint): Promise<void> {
      await perform(endpoint)
    },
  }
}
