import authLogin from '@/resources/fixtures/auth_login.json'
import authLoginProfessional from '@/resources/fixtures/auth_login_professional.json'
import authSignup from '@/resources/fixtures/auth_signup.json'
import professionalCatalog from '@/resources/fixtures/professional_catalog.json'
import opportunities from '@/resources/fixtures/opportunities.json'
import opportunityDetail from '@/resources/fixtures/opportunity_detail.json'
import filters from '@/resources/fixtures/filters.json'
import applicationStatus from '@/resources/fixtures/application_status.json'
import myOpportunities from '@/resources/fixtures/my_opportunities.json'
import receivedRequests from '@/resources/fixtures/received_requests.json'
import requestDetail from '@/resources/fixtures/request_detail.json'
import triageTemplate from '@/resources/fixtures/triage_template.json'
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
  my_opportunities: myOpportunities,
  received_requests: receivedRequests,
  request_detail: requestDetail,
  triage_template: triageTemplate,
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

/**
 * O painel do profissional muda estado: encerrar, excluir, decidir e
 * responder. O mock guarda isso em memoria para a tela refletir a acao,
 * como o servidor fara.
 */
interface PanelState {
  opportunities: Record<string, unknown>[]
  requests: Record<string, unknown>[]
  detail: Record<string, unknown> | null
}

let panel: PanelState = { opportunities: [], requests: [], detail: null }
let sequence = 0

function resetPanel(): void {
  panel = {
    opportunities: loadFixture<{ items: Record<string, unknown>[] }>(
      'my_opportunities',
    ).items,
    requests: loadFixture<{ items: Record<string, unknown>[] }>(
      'received_requests',
    ).items,
    detail: loadFixture<Record<string, unknown>>('request_detail'),
  }
  sequence = 0
}

export function resetMockBackend(): void {
  registrations.clear()
  requestLog.length = 0
  resetPanel()
}

resetPanel()

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

type Handler = (body: unknown, path: string) => MockResponse

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

function pathIdOf(path: string, index: number): string {
  return path.split('/').filter(Boolean)[index] ?? ''
}

/** O handler recebe o corpo e o caminho, para as rotas com id. */
const listMyOpportunities: Handler = () => ({
  status: 200,
  body: {
    items: panel.opportunities,
    page: 1,
    totalPages: 1,
    totalItems: panel.opportunities.length,
  },
})

const createOpportunity: Handler = (body) => {
  const request = body as Record<string, unknown> | null
  if (!request) return errorPayload('Bad Request: malformed body', 400, 'Bad Request')
  sequence += 1
  const created = {
    id: `op-2${String(sequence).padStart(2, '0')}`,
    title: String(request.title ?? '') || 'Oportunidade sem titulo',
    specialty: String(request.specialty ?? ''),
    accessMode: String(request.accessMode ?? 'gratuito'),
    price: request.price ?? null,
    filledVacancies: 0,
    totalVacancies: Number(request.totalVacancies ?? 0),
    applicationCount: 0,
    status: 'ATIVA',
    modality: String(request.modality ?? 'presencial'),
    address: request.address ?? null,
    opensAt: request.opensAt ?? null,
    closesAt: request.closesAt ?? null,
    updatedAt: new Date().toISOString(),
  }
  panel.opportunities = [created, ...panel.opportunities]
  return { status: 201, body: created }
}

const listRequests: Handler = () => ({
  status: 200,
  body: {
    items: panel.requests,
    page: 1,
    totalPages: 1,
    totalItems: panel.requests.length,
  },
})

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

  // Painel do profissional
  { method: 'GET', pattern: '/v1/professional/opportunities', status: 200, fixture: 'my_opportunities', latencyMs: 300, respond: listMyOpportunities },
  { method: 'POST', pattern: '/v1/professional/opportunities', status: 201, fixture: null, latencyMs: 450, respond: createOpportunity },
  { method: 'POST', pattern: '/v1/professional/opportunities/{id}/close', status: 204, fixture: null, latencyMs: 300,
    respond: (_body, path) => {
      const id = pathIdOf(path, 3)
      const found = panel.opportunities.some((item) => item.id === id)
      if (!found) return { status: 404, body: loadFixture('error_404') }
      panel.opportunities = panel.opportunities.map((item) =>
        item.id === id ? { ...item, status: 'ENCERRADA' } : item,
      )
      return { status: 204, body: null }
    } },
  { method: 'GET', pattern: '/v1/professional/opportunities/{id}', status: 200, fixture: null, latencyMs: 250,
    respond: (_body, path) => {
      const id = pathIdOf(path, 3)
      const found = panel.opportunities.find((item) => item.id === id)
      if (!found) return { status: 404, body: loadFixture('error_404') }
      return { status: 200, body: found }
    } },
  { method: 'PUT', pattern: '/v1/professional/opportunities/{id}', status: 200, fixture: null, latencyMs: 400,
    respond: (body, path) => {
      const id = pathIdOf(path, 3)
      const request = body as Record<string, unknown> | null
      if (!request) return errorPayload('Bad Request: malformed body', 400, 'Bad Request')
      const current = panel.opportunities.find((item) => item.id === id)
      if (!current) return { status: 404, body: loadFixture('error_404') }
      // Encerrada nao volta a ser editavel, mesmo que o cliente tente.
      if (current.status === 'ENCERRADA') {
        return errorPayload(
          'Unprocessable Entity: closed opportunity cannot be edited',
          422,
          'Unprocessable Entity',
        )
      }
      const updated = {
        ...current,
        title: String(request.title ?? '') || current.title,
        specialty: String(request.specialty ?? current.specialty),
        accessMode: String(request.accessMode ?? current.accessMode),
        price: request.price ?? null,
        totalVacancies: Number(request.totalVacancies ?? current.totalVacancies),
        modality: String(request.modality ?? current.modality),
        address: request.address ?? null,
        opensAt: request.opensAt ?? current.opensAt,
        closesAt: request.closesAt ?? current.closesAt,
        updatedAt: new Date().toISOString(),
      }
      panel.opportunities = panel.opportunities.map((item) =>
        item.id === id ? updated : item,
      )
      return { status: 200, body: updated }
    } },
  { method: 'DELETE', pattern: '/v1/professional/opportunities/{id}', status: 204, fixture: null, latencyMs: 300,
    respond: (_body, path) => {
      const id = pathIdOf(path, 3)
      const found = panel.opportunities.some((item) => item.id === id)
      if (!found) return { status: 404, body: loadFixture('error_404') }
      panel.opportunities = panel.opportunities.filter((item) => item.id !== id)
      return { status: 204, body: null }
    } },
  { method: 'GET', pattern: '/v1/professional/requests', status: 200, fixture: 'received_requests', latencyMs: 300, respond: listRequests },
  { method: 'GET', pattern: '/v1/professional/requests/{id}', status: 200, fixture: 'request_detail', latencyMs: 250,
    respond: (_body, path) => {
      const id = pathIdOf(path, 3)
      const listed = panel.requests.find((item) => item.id === id)
      if (!listed) return { status: 404, body: loadFixture('error_404') }
      const base = panel.detail ?? loadFixture<Record<string, unknown>>('request_detail')
      return {
        status: 200,
        body: {
          ...base,
          id,
          patientName: listed.patientName,
          opportunityId: listed.opportunityId,
          opportunityTitle: listed.opportunityTitle,
          receivedAt: listed.receivedAt,
          status: listed.status,
        },
      }
    } },
  { method: 'POST', pattern: '/v1/professional/requests/{id}/decision', status: 200, fixture: null, latencyMs: 350,
    respond: (body, path) => {
      const id = pathIdOf(path, 3)
      const request = body as { status?: string } | null
      const status = request?.status
      if (status !== 'EM_ANALISE' && status !== 'APROVADA' && status !== 'RECUSADA') {
        return errorPayload('Unprocessable Entity: unknown status', 422, 'Unprocessable Entity')
      }
      const listed = panel.requests.find((item) => item.id === id)
      if (!listed) return { status: 404, body: loadFixture('error_404') }
      panel.requests = panel.requests.map((item) =>
        item.id === id
          ? { ...item, status, canMessage: status === 'APROVADA' }
          : item,
      )
      const base = panel.detail ?? loadFixture<Record<string, unknown>>('request_detail')
      return {
        status: 200,
        body: {
          ...base,
          id,
          patientName: listed.patientName,
          opportunityId: listed.opportunityId,
          opportunityTitle: listed.opportunityTitle,
          receivedAt: listed.receivedAt,
          status,
        },
      }
    } },
  { method: 'POST', pattern: '/v1/professional/requests/{id}/messages', status: 201, fixture: null, latencyMs: 250,
    respond: (body) => {
      const request = body as { text?: string } | null
      const text = (request?.text ?? '').trim()
      if (text === '') {
        return errorPayload('Unprocessable Entity: empty message', 422, 'Unprocessable Entity')
      }
      sequence += 1
      return {
        status: 201,
        body: {
          id: `msg-${sequence + 10}`,
          author: 'PROFISSIONAL',
          text,
          sentAt: new Date().toISOString(),
        },
      }
    } },
  { method: 'GET', pattern: '/v1/professional/triage-template', status: 200, fixture: 'triage_template', latencyMs: 200 },

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
      return json(route.respond(parsed, url.pathname))
    }

    return json({
      status: route.status,
      body: route.fixture === null ? null : loadFixture(route.fixture),
    })
  }
}

export const mockRoutes = ROUTES
