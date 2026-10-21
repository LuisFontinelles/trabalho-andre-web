import authLogin from '@/resources/fixtures/auth_login.json'
import authLoginProfessional from '@/resources/fixtures/auth_login_professional.json'
import authSignup from '@/resources/fixtures/auth_signup.json'
import professionalCatalog from '@/resources/fixtures/professional_catalog.json'
import opportunities from '@/resources/fixtures/opportunities.json'
import opportunityDetail from '@/resources/fixtures/opportunity_detail.json'
import filters from '@/resources/fixtures/filters.json'
import applicationStatus from '@/resources/fixtures/application_status.json'
import error400 from '@/resources/fixtures/error_400.json'
import error401 from '@/resources/fixtures/error_401.json'
import error404 from '@/resources/fixtures/error_404.json'
import error500 from '@/resources/fixtures/error_500.json'

import type { AuthResponseDTO, SignUpRequestDTO } from '@/data/dto'
import type { HttpMethod } from '@/data/network/httpClient'

/**
 * Backend de mentira do CareBridge, equivalente ao FixtureURLProtocol do
 * aplicativo iOS. Ele substitui o fetch, entao todo o caminho real continua
 * sendo exercitado: montagem da URL, status, corpo de erro e decodificacao.
 * Apontar para a API de verdade e nao instalar este interceptador.
 */

export const BASE_URL = 'https://api.carebridge.local/v1'

export const TEST_ACCOUNTS = {
  'paciente@teste.com': 'auth_login',
  'profissional@teste.com': 'auth_login_professional',
} as const

export type TestAccountEmail = keyof typeof TEST_ACCOUNTS

export const DEBUG_VERIFICATION_CODE = '0000'

const FIXTURES: Record<string, unknown> = {
  auth_login: authLogin,
  auth_login_professional: authLoginProfessional,
  auth_signup: authSignup,
  professional_catalog: professionalCatalog,
  opportunities,
  opportunity_detail: opportunityDetail,
  filters,
  application_status: applicationStatus,
  error_400: error400,
  error_401: error401,
  error_404: error404,
  error_500: error500,
}

export function loadFixture<T = unknown>(name: string): T {
  const value = FIXTURES[name]
  if (value === undefined) throw new Error(`Fixture ausente: ${name}.json`)
  return structuredClone(value) as T
}

export function matchTestAccount(email: string | null | undefined): TestAccountEmail | null {
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  return normalized in TEST_ACCOUNTS ? (normalized as TestAccountEmail) : null
}

/** Cadastros feitos durante a sessao, para a verificacao devolver o perfil certo. */
interface RegisteredAccount {
  name: string
  email: string
  profile: string
}

const registrations = new Map<string, RegisteredAccount>()

export function resetMockBackend(): void {
  registrations.clear()
  requestLog.length = 0
}

export const requestLog: string[] = []

interface MockResponse {
  status: number
  body: unknown | null
}

function errorPayload(message: string, status: number, error: string): MockResponse {
  return {
    status,
    body: {
      statusCode: status,
      message,
      error,
      requestId: crypto.randomUUID(),
    },
  }
}

type Handler = (body: unknown) => MockResponse

interface Route {
  method: HttpMethod
  pattern: string
  status: number
  fixture: string | null
  latencyMs: number
  respond?: Handler
}

/** Aceita curingas no formato /opportunities/{id}. */
export function matchesPattern(pattern: string, path: string): boolean {
  const p = pattern.split('/').filter(Boolean)
  const c = path.split('/').filter(Boolean)
  if (p.length !== c.length) return false
  return p.every((segment, index) => segment.startsWith('{') || segment === c[index])
}

const loginResponder: Handler = (body) => {
  const request = body as { email?: string; password?: string } | null
  if (!request) return errorPayload('Bad Request: malformed body', 400, 'Bad Request')
  const account = matchTestAccount(request.email)
  if (account === null || !request.password) {
    return { status: 401, body: loadFixture('error_401') }
  }
  return { status: 200, body: loadFixture(TEST_ACCOUNTS[account]) }
}

const signUpResponder: Handler = (body) => {
  const request = body as SignUpRequestDTO | null
  if (!request) return errorPayload('Bad Request: malformed body', 400, 'Bad Request')
  if (!request.acceptedTerms) {
    return errorPayload(
      'Unprocessable Entity: terms not accepted',
      422,
      'Unprocessable Entity',
    )
  }
  const email = request.email.toLowerCase()
  registrations.set(email, {
    name: request.username,
    email,
    profile: request.profile,
  })
  return {
    status: 201,
    body: { email, profile: request.profile, codeLength: 4 },
  }
}

const verifyResponder: Handler = (body) => {
  const request = body as { email?: string; code?: string } | null
  if (!request) return errorPayload('Bad Request: malformed body', 400, 'Bad Request')
  if (request.code !== DEBUG_VERIFICATION_CODE) {
    return { status: 401, body: loadFixture('error_401') }
  }

  const email = (request.email ?? '').toLowerCase()
  const account = matchTestAccount(email)
  const registration = registrations.get(email)
  const fixture =
    account !== null
      ? TEST_ACCOUNTS[account]
      : registration?.profile === 'PROFISSIONAL'
        ? 'auth_login_professional'
        : 'auth_login'

  const session = loadFixture<AuthResponseDTO>(fixture)
  if (registration) {
    session.user = {
      ...session.user,
      username: registration.name,
      email: registration.email,
    }
  }
  return { status: 200, body: session }
}

const ROUTES: Route[] = [
  { method: 'POST', pattern: '/v1/auth/login', status: 200, fixture: 'auth_login', latencyMs: 400, respond: loginResponder },
  { method: 'POST', pattern: '/v1/auth/google', status: 200, fixture: 'auth_login', latencyMs: 500 },
  { method: 'POST', pattern: '/v1/auth/signup', status: 201, fixture: 'auth_signup', latencyMs: 450, respond: signUpResponder },
  { method: 'POST', pattern: '/v1/auth/verify', status: 200, fixture: 'auth_login', latencyMs: 400, respond: verifyResponder },
  { method: 'POST', pattern: '/v1/auth/resend-code', status: 204, fixture: null, latencyMs: 350 },
  { method: 'GET', pattern: '/v1/auth/professional-catalog', status: 200, fixture: 'professional_catalog', latencyMs: 200 },
  { method: 'GET', pattern: '/v1/opportunities', status: 200, fixture: 'opportunities', latencyMs: 350 },
  { method: 'GET', pattern: '/v1/opportunities/{id}', status: 200, fixture: 'opportunity_detail', latencyMs: 250 },
  { method: 'GET', pattern: '/v1/filters', status: 200, fixture: 'filters', latencyMs: 200 },
  { method: 'GET', pattern: '/v1/applications/{id}', status: 200, fixture: 'application_status', latencyMs: 250 },

  // Rotas so para exercitar o tratamento de erro da camada de rede.
  { method: 'GET', pattern: '/v1/debug/no-content', status: 204, fixture: null, latencyMs: 50 },
  { method: 'GET', pattern: '/v1/debug/bad-request', status: 400, fixture: 'error_400', latencyMs: 50 },
  { method: 'GET', pattern: '/v1/debug/unauthorized', status: 401, fixture: 'error_401', latencyMs: 50 },
  { method: 'GET', pattern: '/v1/debug/not-found', status: 404, fixture: 'error_404', latencyMs: 50 },
  { method: 'GET', pattern: '/v1/debug/server-error', status: 500, fixture: 'error_500', latencyMs: 50 },
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Substitui o fetch. Use latency = false nos testes para nao esperar. */
export function createMockFetch(options: { latency?: boolean } = {}): typeof fetch {
  const useLatency = options.latency ?? true

  return async function mockFetch(input, init) {
    const url = new URL(typeof input === 'string' ? input : String(input))
    const method = (init?.method ?? 'GET') as HttpMethod
    requestLog.push(`${method} ${url.pathname}${url.search}`)

    const route = ROUTES.find(
      (candidate) =>
        candidate.method === method && matchesPattern(candidate.pattern, url.pathname),
    )

    if (useLatency) await sleep(route?.latencyMs ?? 100)

    // 204 e 304 nao admitem corpo: o construtor de Response recusa.
    const json = (payload: MockResponse) => {
      const empty = payload.status === 204 || payload.status === 304
      return new Response(
        empty || payload.body === null ? null : JSON.stringify(payload.body),
        {
          status: payload.status,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    if (!route) {
      return json(
        errorPayload(`Not Found: ${method} ${url.pathname}`, 404, 'Not Found'),
      )
    }

    if (route.respond) {
      let parsed: unknown = null
      if (typeof init?.body === 'string') {
        try {
          parsed = JSON.parse(init.body)
        } catch {
          parsed = null
        }
      }
      return json(route.respond(parsed))
    }

    return json({
      status: route.status,
      body: route.fixture === null ? null : loadFixture(route.fixture),
    })
  }
}

export const mockRoutes = ROUTES
