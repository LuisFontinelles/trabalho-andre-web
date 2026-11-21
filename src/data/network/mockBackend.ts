import contas from '@/resources/fixtures/contas.json'
import catalogos from '@/resources/fixtures/catalogos.json'
import oportunidadesProfissional from '@/resources/fixtures/oportunidades_profissional.json'
import inscricoes from '@/resources/fixtures/inscricoes.json'

import type {
  LoginResponseDTO,
  MeDTO,
  ProfissionalCadastroDTO,
} from '@/data/dto'
import type {
  CombinadoDTO,
  InscricaoDTO,
  MensagemDTO,
  OfertanteDTO,
  OportunidadeDTO,
  OportunidadeRequestDTO,
} from '@/data/professionalDto'
import type { HttpMethod } from '@/data/network/httpClient'

/**
 * Servidor simulado do CareBridge, equivalente ao MockBackend do app iOS.
 * Responde o CONTRATO-API-CareBridge.md (versao 2) com as regras da secao 10:
 * contas de teste, codigo 0000, bloqueio depois de 5 senhas erradas e token
 * `mock.<email>`. Ele substitui o fetch, entao todo o caminho real continua
 * sendo exercitado: montagem da URL, token, status, corpo de erro e
 * decodificacao. Apontar para a API de verdade e nao instalar este fetch.
 */

export const BASE_URL = 'https://api.carebridge.local'

export const TEST_ACCOUNTS = ['paciente@teste.com', 'profissional@teste.com'] as const
export type TestAccountEmail = (typeof TEST_ACCOUNTS)[number]

export const DEBUG_VERIFICATION_CODE = '0000'
/** Token que o servidor simulado trata como vencido. */
export const EXPIRED_TOKEN = 'expired'
export const MAX_FAILED_LOGINS = 5
export const LOCK_MS = 15 * 60 * 1000
export const TOKEN_SECONDS = 3600
/** Prazo que o paciente tem para responder um pedido de informacao. */
export const INFO_REQUEST_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

const FIXTURES: Record<string, unknown> = {
  contas,
  catalogos,
  oportunidades_profissional: oportunidadesProfissional,
  inscricoes,
}

export function loadFixture<T = unknown>(name: string): T {
  const value = FIXTURES[name]
  if (value === undefined) throw new Error(`Fixture ausente: ${name}.json`)
  return structuredClone(value) as T
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

export function matchTestAccount(email: string | null | undefined): TestAccountEmail | null {
  const normalized = normalizeEmail(email)
  return TEST_ACCOUNTS.find((item) => item === normalized) ?? null
}

/** Relogio do servidor simulado. Os testes trocam para controlar o bloqueio. */
let clock: () => number = () => Date.now()

export function setMockClock(next: (() => number) | null): void {
  clock = next ?? (() => Date.now())
}

const isoNow = () => new Date(clock()).toISOString()

interface Account {
  me: MeDTO
  /** Nulo nas contas de teste, que entram com qualquer senha nao vazia. */
  password: string | null
  /** Ja confirmou o codigo por e-mail. */
  isVerified: boolean
  /** Dados do registro, para montar o `ofertante` das oportunidades. */
  ofertante: OfertanteDTO | null
}

interface State {
  accounts: Map<string, Account>
  failedLogins: Map<string, number>
  lockedUntil: Map<string, number>
  opportunities: OportunidadeDTO[]
  requests: InscricaoDTO[]
  sequence: number
}

/**
 * As datas das fixtures sao fixas, entao com o passar dos dias a lista do
 * demo mostrava "15 dias", "16 dias" em vez de "Hoje" e "Ontem" como no
 * prototipo. Aqui as datas andam em dias inteiros para que a mais recente
 * caia no dia de hoje, mantendo a distancia entre elas e o horario.
 */
export function dayShift(
  items: readonly Record<string, unknown>[],
  field: string,
  now: Date = new Date(),
): number {
  const times = items
    .map((item) => new Date(String(item[field])).getTime())
    .filter((time) => !Number.isNaN(time))
  if (times.length === 0) return 0
  const startOf = (time: number) => Math.floor(time / DAY_MS) * DAY_MS
  return startOf(now.getTime()) - startOf(Math.max(...times))
}

function shiftIso(value: string | null | undefined, shift: number): string | null {
  if (value === null || value === undefined) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? value : new Date(time + shift).toISOString()
}

export function rebaseToToday(
  items: Record<string, unknown>[],
  field: string,
  now: Date = new Date(),
): Record<string, unknown>[] {
  const shift = dayShift(items, field, now)
  return items.map((item) => {
    const time = new Date(String(item[field])).getTime()
    if (Number.isNaN(time)) return item
    return { ...item, [field]: new Date(time + shift).toISOString() }
  })
}

/** Anda todas as datas da inscricao juntas, para os prazos continuarem coerentes. */
export function rebaseRequests(items: InscricaoDTO[], now: Date = new Date()): InscricaoDTO[] {
  const shift = dayShift(items as unknown as Record<string, unknown>[], 'dataInscricao', now)
  const message = (item: MensagemDTO): MensagemDTO => ({
    ...item,
    enviadaEm: shiftIso(item.enviadaEm, shift) ?? item.enviadaEm,
  })
  return items.map((item) => ({
    ...item,
    dataInscricao: shiftIso(item.dataInscricao, shift) ?? item.dataInscricao,
    prazoResposta: shiftIso(item.prazoResposta, shift),
    decididaEm: shiftIso(item.decididaEm, shift),
    consentimentoDadosSaudeEm: shiftIso(item.consentimentoDadosSaudeEm, shift),
    pedidoInformacao:
      item.pedidoInformacao === null
        ? null
        : {
            ...item.pedidoInformacao,
            prazo: shiftIso(item.pedidoInformacao.prazo, shift) ?? item.pedidoInformacao.prazo,
          },
    documentos: item.documentos.map((document) => ({
      ...document,
      enviadoEm: shiftIso(document.enviadoEm, shift) ?? document.enviadoEm,
    })),
    ultimaMensagem: item.ultimaMensagem === null ? null : message(item.ultimaMensagem),
    mensagens: item.mensagens === null ? null : item.mensagens.map(message),
  }))
}

const DEMO_PROFESSIONAL = 'profissional@teste.com'

function seed(): State {
  const accounts = new Map<string, Account>()
  const opportunities = loadFixture<OportunidadeDTO[]>('oportunidades_profissional')
  for (const me of loadFixture<MeDTO[]>('contas')) {
    accounts.set(me.email, {
      me,
      password: null,
      isVerified: true,
      ofertante: me.email === DEMO_PROFESSIONAL ? (opportunities[0]?.ofertante ?? null) : null,
    })
  }
  return {
    accounts,
    failedLogins: new Map(),
    lockedUntil: new Map(),
    opportunities,
    requests: rebaseRequests(loadFixture<InscricaoDTO[]>('inscricoes'), new Date(clock())),
    sequence: 0,
  }
}

let state: State = seed()

export const requestLog: string[] = []
/** Cabecalho Authorization de cada requisicao, na mesma ordem do requestLog. */
export const authorizationLog: (string | null)[] = []

export function resetMockBackend(): void {
  setMockClock(null)
  requestLog.length = 0
  authorizationLog.length = 0
  state = seed()
}

interface MockRequest {
  method: HttpMethod
  path: string
  query: URLSearchParams
  body: unknown
  token: string | null
}

interface MockResponse {
  status: number
  body: unknown | null
}

const REASON: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
}

/** Corpo de erro do contrato: `status` e `message`, mais os campos do Spring. */
function failure(status: number, message: string, path = ''): MockResponse {
  return {
    status,
    body: { status, message, error: REASON[status] ?? 'Error', path, timestamp: isoNow() },
  }
}

const ok = (body: unknown, status = 200): MockResponse => ({ status, body })
const empty = (): MockResponse => ({ status: 204, body: null })

type Handler = (request: MockRequest, params: string[]) => MockResponse

interface Route {
  method: HttpMethod
  pattern: string
  latencyMs: number
  handler: Handler
}

/** Aceita curingas no formato /oportunidades/{id}. */
export function matchesPattern(pattern: string, path: string): boolean {
  return paramsOf(pattern, path) !== null
}

function paramsOf(pattern: string, path: string): string[] | null {
  const p = pattern.split('/').filter(Boolean)
  const c = path.split('/').filter(Boolean)
  if (p.length !== c.length) return null
  const params: string[] = []
  for (let index = 0; index < p.length; index += 1) {
    const segment = p[index]!
    if (segment.startsWith('{')) params.push(decodeURIComponent(c[index]!))
    else if (segment !== c[index]) return null
  }
  return params
}

// ---------------------------------------------------------------------------
// Acesso

function loginResponse(account: Account): LoginResponseDTO {
  return {
    token: `mock.${account.me.email}`,
    autenticado: true,
    tipoPerfil: account.me.tipoPerfil,
    validadoInstitucionalmente:
      account.me.tipoPerfil !== 'PROFISSIONAL_SAUDE' ||
      account.me.situacaoRegistro === 'VERIFICADO',
    expiraEmSegundos: TOKEN_SECONDS,
  }
}

const TOO_MANY = 'Muitas tentativas. Tente de novo em 15 minutos.'

const login: Handler = (request) => {
  const body = request.body as { email?: string; password?: string } | null
  if (body === null || typeof body !== 'object') return failure(400, 'Corpo inválido.', request.path)
  const email = normalizeEmail(body.email)
  const now = clock()

  const until = state.lockedUntil.get(email)
  if (until !== undefined && until > now) return failure(429, TOO_MANY, request.path)

  const account = state.accounts.get(email)
  const password = body.password ?? ''
  const matches =
    account !== undefined &&
    account.isVerified &&
    password !== '' &&
    (account.password === null || account.password === password)
  if (!matches) {
    const failures = (state.failedLogins.get(email) ?? 0) + 1
    state.failedLogins.set(email, failures)
    if (failures >= MAX_FAILED_LOGINS) {
      state.failedLogins.set(email, 0)
      state.lockedUntil.set(email, now + LOCK_MS)
      return failure(429, TOO_MANY, request.path)
    }
    return failure(401, 'E-mail ou senha incorretos.', request.path)
  }
  state.failedLogins.delete(email)
  state.lockedUntil.delete(email)
  return ok(loginResponse(account))
}

const signUp: Handler = (request) => {
  const body = request.body as ProfissionalCadastroDTO | null
  if (body === null || typeof body !== 'object' || body.usuarioDto === undefined) {
    return failure(400, 'Corpo inválido.', request.path)
  }
  if (body.aceitouTermos !== true) {
    return failure(400, 'Aceite os Termos de Uso e a Política de Privacidade.', request.path)
  }
  if (!/^\d{4,7}$/.test(body.numeroRegistro ?? '')) {
    return failure(400, 'O número do registro tem de 4 a 7 dígitos.', request.path)
  }
  const email = normalizeEmail(body.usuarioDto.email)
  if (state.accounts.get(email)?.isVerified === true) {
    return failure(409, 'Já existe um usuário cadastrado com este e-mail.', request.path)
  }
  state.sequence += 1
  const id = `us-${String(state.sequence).padStart(4, '0')}`
  // O perfil vem da rota, nunca do corpo.
  state.accounts.set(email, {
    me: {
      id,
      email,
      tipoPerfil: 'PROFISSIONAL_SAUDE',
      nome: body.nome,
      dataNascimento: null,
      telefone: null,
      situacaoRegistro: 'EM_VERIFICACAO',
      conselho: body.conselho,
      uf: body.uf,
      numeroRegistro: body.numeroRegistro,
      especialidade: body.especialidade,
      ondeAtende: body.ondeAtende,
    },
    password: body.usuarioDto.senha,
    isVerified: false,
    ofertante: {
      id: `pr-${id}`,
      nome: body.nome,
      conselho: body.conselho,
      uf: body.uf,
      numeroRegistro: body.numeroRegistro,
      ondeAtende: body.ondeAtende,
      verificado: false,
    },
  })
  return ok(
    { email, tipoPerfil: 'PROFISSIONAL_SAUDE', exigeVerificacao: true, tamanhoCodigo: 4 },
    201,
  )
}

const verify: Handler = (request) => {
  const body = request.body as { email?: string; codigo?: string } | null
  if (body === null || typeof body !== 'object') return failure(400, 'Corpo inválido.', request.path)
  if (body.codigo !== DEBUG_VERIFICATION_CODE) {
    return failure(401, 'Código incorreto ou expirado.', request.path)
  }
  const email = normalizeEmail(body.email)
  const account = state.accounts.get(email)
  if (account === undefined) return failure(404, 'Cadastro não encontrado.', request.path)
  account.isVerified = true
  return ok(loginResponse(account))
}

const emailOnly: Handler = (request) => {
  const body = request.body as { email?: string } | null
  if (normalizeEmail(body?.email) === '') return failure(400, 'Informe o e-mail.', request.path)
  return empty()
}

/**
 * Quem esta chamando. `mock.<email>` e a conta daquele e-mail. Um token que
 * nao e do simulado (o JWT da API real, quando login e cadastro vao para la)
 * vale como o profissional de demonstracao, para o resto do painel seguir
 * funcionando sobre as fixtures.
 */
function caller(request: MockRequest): Account | null {
  const token = request.token
  if (token === null || token === '' || token === EXPIRED_TOKEN) return null
  if (!token.startsWith('mock.')) return state.accounts.get(DEMO_PROFESSIONAL) ?? null
  const account = state.accounts.get(normalizeEmail(token.slice(5)))
  return account?.isVerified ? account : null
}

const SESSION_EXPIRED = 'Sua sessão expirou. Entre de novo.'

function authenticated(handler: (request: MockRequest, params: string[], account: Account) => MockResponse): Handler {
  return (request, params) => {
    const account = caller(request)
    if (account === null) return failure(401, SESSION_EXPIRED, request.path)
    return handler(request, params, account)
  }
}

function professional(handler: (request: MockRequest, params: string[], account: Account) => MockResponse): Handler {
  return authenticated((request, params, account) => {
    if (account.me.tipoPerfil !== 'PROFISSIONAL_SAUDE') {
      return failure(403, 'Esta área é só para profissionais de saúde.', request.path)
    }
    return handler(request, params, account)
  })
}

// ---------------------------------------------------------------------------
// Oportunidades

const PRESENTIAL = ['PRESENCIAL', 'HIBRIDO']

/**
 * Publicar valida a tabela de regras da secao 5 (mais titulo e as duas
 * modalidades, de que as regras dependem). Rascunho aceita campos vazios.
 * O resto (tipo de servico, publico, contato, triagem) o painel ja exige
 * antes de enviar.
 */
export function publishError(body: OportunidadeRequestDTO): string | null {
  const filled = (value: string | null | undefined) => (value ?? '').trim() !== ''
  if (!filled(body.titulo)) return 'Informe o título.'
  const description = (body.descricao ?? '').trim()
  if (description.length < 40 || description.length > 600) {
    return 'A descrição precisa ter de 40 a 600 caracteres.'
  }
  if (!filled(body.modalidade)) return 'Informe a modalidade de atendimento.'
  if (PRESENTIAL.includes(body.modalidade ?? '') && (!filled(body.cep) || !filled(body.endereco))) {
    return 'CEP e endereço são obrigatórios no atendimento presencial ou híbrido.'
  }
  if (!filled(body.modalidadeAcesso)) return 'Informe a modalidade de acesso.'
  if (body.modalidadeAcesso === 'PRECO_SOCIAL' && !((body.preco ?? 0) > 0)) {
    return 'Informe um preço maior que zero.'
  }
  if (body.modalidadeAcesso !== 'PRECO_SOCIAL' && body.preco !== null) {
    return 'Só a modalidade preço social tem preço.'
  }
  if (!((body.vagasTotais ?? 0) >= 1)) return 'O número de vagas precisa ser 1 ou mais.'
  if (!filled(body.inscricoesDe) || !filled(body.inscricoesAte)) {
    return 'Informe o período de inscrições.'
  }
  if ((body.inscricoesAte ?? '') <= (body.inscricoesDe ?? '')) {
    return 'O encerramento precisa ser depois do início.'
  }
  if (!body.semRestricoes && !filled(body.criteriosElegibilidade)) {
    return 'Informe os critérios de elegibilidade ou marque sem restrições.'
  }
  return null
}

/** Os campos que o corpo traz, como vieram. */
function fieldsOf(body: OportunidadeRequestDTO): Omit<OportunidadeRequestDTO, 'status'> {
  return {
    titulo: String(body.titulo ?? '').trim(),
    descricao: body.descricao ?? null,
    tipoServico: body.tipoServico ?? null,
    especialidade: body.especialidade ?? null,
    modalidade: body.modalidade ?? null,
    modalidadeAcesso: body.modalidadeAcesso ?? null,
    preco: body.preco ?? null,
    publicoAlvo: Array.isArray(body.publicoAlvo) ? body.publicoAlvo : [],
    publicoAlvoObservacao: body.publicoAlvoObservacao ?? null,
    vagasTotais: body.vagasTotais ?? null,
    cep: body.cep ?? null,
    endereco: body.endereco ?? null,
    cidade: body.cidade ?? null,
    uf: body.uf ?? null,
    inscricoesDe: body.inscricoesDe ?? null,
    inscricoesAte: body.inscricoesAte ?? null,
    criteriosElegibilidade: body.criteriosElegibilidade ?? null,
    semRestricoes: body.semRestricoes === true,
    formaContato: body.formaContato ?? null,
    prazoRespostaDias: body.prazoRespostaDias ?? 15,
    triagem: body.triagem ?? null,
  }
}

const NOT_VERIFIED =
  'Seu cadastro ainda está em verificação. Salve como rascunho; publicar fica liberado depois da verificação.'

function canPublish(account: Account): boolean {
  return account.me.situacaoRegistro === 'VERIFICADO'
}

function ofertanteOf(account: Account): OfertanteDTO {
  return (
    account.ofertante ?? {
      id: `pr-${account.me.id}`,
      nome: account.me.nome,
      conselho: null,
      uf: null,
      numeroRegistro: null,
      ondeAtende: null,
      verificado: canPublish(account),
    }
  )
}

const myOpportunities = professional(() => ok(state.opportunities))

/** Publica. O rascunho so aparece para o profissional (dono do painel simulado). */
const getOpportunity: Handler = (request, [id]) => {
  const found = state.opportunities.find((item) => item.id === id)
  const account = caller(request)
  const isOwner = account?.me.tipoPerfil === 'PROFISSIONAL_SAUDE'
  if (found === undefined || (found.status === 'RASCUNHO' && !isOwner)) {
    return failure(404, 'Oportunidade não encontrada.', request.path)
  }
  return ok(isOwner ? found : { ...found, totalInscricoes: null })
}

const createOpportunity = professional((request, _params, account) => {
  const body = request.body as OportunidadeRequestDTO | null
  if (body === null || typeof body !== 'object') return failure(400, 'Corpo inválido.', request.path)
  const status = body.status === 'RASCUNHO' ? 'RASCUNHO' : 'ATIVA'
  if (status === 'ATIVA') {
    if (!canPublish(account)) return failure(403, NOT_VERIFIED, request.path)
    const problem = publishError(body)
    if (problem !== null) return failure(400, problem, request.path)
  } else if (String(body.titulo ?? '').trim() === '') {
    return failure(400, 'Informe o título.', request.path)
  }
  state.sequence += 1
  const created: OportunidadeDTO = {
    id: `op-2${String(state.sequence).padStart(2, '0')}`,
    ...fieldsOf(body),
    status,
    vagasPreenchidas: 0,
    distanciaKm: null,
    ultimaAtualizacao: isoNow(),
    ofertante: ofertanteOf(account),
    totalInscricoes: 0,
  }
  state.opportunities = [created, ...state.opportunities]
  return ok(created, 201)
})

const updateOpportunity = professional((request, [id], account) => {
  const body = request.body as OportunidadeRequestDTO | null
  if (body === null || typeof body !== 'object') return failure(400, 'Corpo inválido.', request.path)
  const current = state.opportunities.find((item) => item.id === id)
  if (current === undefined) return failure(404, 'Oportunidade não encontrada.', request.path)
  if (current.status === 'ENCERRADA') {
    return failure(409, 'Oportunidade encerrada não pode ser editada.', request.path)
  }
  // O que ja foi publicado nao volta a ser rascunho.
  const status = current.status === 'RASCUNHO' && body.status === 'RASCUNHO' ? 'RASCUNHO' : 'ATIVA'
  if (status === 'ATIVA') {
    if (current.status === 'RASCUNHO' && !canPublish(account)) {
      return failure(403, NOT_VERIFIED, request.path)
    }
    const problem = publishError(body)
    if (problem !== null) return failure(400, problem, request.path)
  }
  const updated: OportunidadeDTO = {
    ...current,
    ...fieldsOf(body),
    status,
    ultimaAtualizacao: isoNow(),
  }
  state.opportunities = state.opportunities.map((item) => (item.id === id ? updated : item))
  return ok(updated)
})

const closeOpportunity = professional((request, [id]) => {
  const current = state.opportunities.find((item) => item.id === id)
  if (current === undefined) return failure(404, 'Oportunidade não encontrada.', request.path)
  if (current.status !== 'ATIVA') {
    return failure(409, 'Só uma oportunidade ativa pode ser encerrada.', request.path)
  }
  state.opportunities = state.opportunities.map((item) =>
    item.id === id ? { ...item, status: 'ENCERRADA', ultimaAtualizacao: isoNow() } : item,
  )
  return empty()
})

const deleteOpportunity = professional((request, [id]) => {
  const current = state.opportunities.find((item) => item.id === id)
  if (current === undefined) return failure(404, 'Oportunidade não encontrada.', request.path)
  if (current.status !== 'RASCUNHO') {
    return failure(409, 'Só rascunho pode ser excluído.', request.path)
  }
  state.opportunities = state.opportunities.filter((item) => item.id !== id)
  return empty()
})

// ---------------------------------------------------------------------------
// Inscricoes

const FINAL_STATUSES = ['APROVADA', 'RECUSADA', 'CANCELADA']
const ALREADY_DECIDED = 'Esta solicitação já foi decidida.'

function listed(item: InscricaoDTO): InscricaoDTO {
  return { ...item, mensagens: null }
}

function replaceRequest(updated: InscricaoDTO): InscricaoDTO {
  state.requests = state.requests.map((item) => (item.id === updated.id ? updated : item))
  return updated
}

function withRequest(
  handler: (request: MockRequest, item: InscricaoDTO, account: Account) => MockResponse,
): Handler {
  return professional((request, [id], account) => {
    const item = state.requests.find((entry) => entry.id === id)
    if (item === undefined) return failure(404, 'Solicitação não encontrada.', request.path)
    return handler(request, item, account)
  })
}

const listRequests = professional((request) => {
  const status = request.query.get('status')
  const items = [...state.requests]
    .filter((item) => status === null || status === '' || item.status === status)
    .sort((a, b) => b.dataInscricao.localeCompare(a.dataInscricao))
  return ok(items.map(listed))
})

const requestDetail = withRequest((_request, item) =>
  ok({ ...item, mensagens: item.mensagens ?? [] }),
)

const decide = withRequest((request, item) => {
  const body = request.body as { status?: string; motivo?: string | null; combinado?: CombinadoDTO | null } | null
  const status = body?.status
  if (status !== 'APROVADA' && status !== 'RECUSADA') {
    return failure(400, 'A decisão precisa ser APROVADA ou RECUSADA.', request.path)
  }
  const reason = (body?.motivo ?? '').trim()
  if (status === 'RECUSADA' && reason === '') {
    return failure(400, 'Informe o motivo da recusa.', request.path)
  }
  if (FINAL_STATUSES.includes(item.status)) return failure(409, ALREADY_DECIDED, request.path)

  if (status === 'APROVADA') {
    const opportunity = state.opportunities.find((entry) => entry.id === item.oportunidade.id)
    if (opportunity !== undefined) {
      if (opportunity.vagasPreenchidas >= (opportunity.vagasTotais ?? 0)) {
        return failure(409, 'Não há vagas restantes nesta oportunidade.', request.path)
      }
      // Aprovar soma 1 em vagasPreenchidas.
      state.opportunities = state.opportunities.map((entry) =>
        entry.id === opportunity.id
          ? { ...entry, vagasPreenchidas: entry.vagasPreenchidas + 1 }
          : entry,
      )
    }
  }
  const decided = replaceRequest({
    ...item,
    status,
    decididaEm: isoNow(),
    motivoDecisao: status === 'RECUSADA' ? reason : null,
    combinado:
      status === 'APROVADA'
        ? (body?.combinado ?? { quando: 'A combinar', onde: 'A combinar', levar: '' })
        : null,
    podeTrocarMensagens: status === 'APROVADA',
  })
  return ok({ ...decided, mensagens: decided.mensagens ?? [] })
})

const askInfo = withRequest((request, item) => {
  const body = request.body as { texto?: string } | null
  const text = (body?.texto ?? '').trim()
  if (text === '') return failure(400, 'Escreva o que falta.', request.path)
  if (FINAL_STATUSES.includes(item.status)) return failure(409, ALREADY_DECIDED, request.path)
  const waiting = replaceRequest({
    ...item,
    status: 'AGUARDANDO_INFORMACOES',
    pedidoInformacao: {
      texto: text,
      prazo: new Date(clock() + INFO_REQUEST_DAYS * DAY_MS).toISOString(),
    },
  })
  return ok({ ...waiting, mensagens: waiting.mensagens ?? [] })
})

const sendMessage = withRequest((request, item, account) => {
  const body = request.body as { texto?: string } | null
  const text = (body?.texto ?? '').trim()
  if (text === '') return failure(400, 'Escreva a mensagem.', request.path)
  if (item.status !== 'APROVADA') {
    return failure(409, 'As mensagens ficam disponíveis depois da aprovação.', request.path)
  }
  state.sequence += 1
  const message: MensagemDTO = {
    id: `msg-${100 + state.sequence}`,
    autor: 'PROFISSIONAL_SAUDE',
    nomeAutor: account.me.nome,
    texto: text,
    enviadaEm: isoNow(),
  }
  replaceRequest({
    ...item,
    mensagens: [...(item.mensagens ?? []), message],
    ultimaMensagem: message,
  })
  return ok(message, 201)
})

const ROUTES: Route[] = [
  // Acesso
  { method: 'POST', pattern: '/user/login', latencyMs: 400, handler: login },
  {
    method: 'GET',
    pattern: '/user/me',
    latencyMs: 200,
    handler: authenticated((_request, _params, account) => ok(account.me)),
  },
  { method: 'POST', pattern: '/profissional-saude/cadastro', latencyMs: 600, handler: signUp },
  { method: 'POST', pattern: '/user/verificacao', latencyMs: 400, handler: verify },
  { method: 'POST', pattern: '/user/verificacao/reenvio', latencyMs: 350, handler: emailOnly },
  // Responde igual exista ou nao a conta, para nao revelar quem tem cadastro.
  { method: 'POST', pattern: '/user/senha/recuperacao', latencyMs: 400, handler: emailOnly },

  // Catalogo
  { method: 'GET', pattern: '/catalogos', latencyMs: 200, handler: () => ok(loadFixture('catalogos')) },

  // Oportunidades
  { method: 'GET', pattern: '/profissional-saude/oportunidades', latencyMs: 300, handler: myOpportunities },
  { method: 'GET', pattern: '/oportunidades/{id}', latencyMs: 250, handler: getOpportunity },
  { method: 'POST', pattern: '/oportunidades', latencyMs: 450, handler: createOpportunity },
  { method: 'PUT', pattern: '/oportunidades/{id}', latencyMs: 400, handler: updateOpportunity },
  { method: 'POST', pattern: '/oportunidades/{id}/encerrar', latencyMs: 300, handler: closeOpportunity },
  { method: 'DELETE', pattern: '/oportunidades/{id}', latencyMs: 300, handler: deleteOpportunity },

  // Inscricoes recebidas
  { method: 'GET', pattern: '/profissional-saude/inscricoes', latencyMs: 300, handler: listRequests },
  { method: 'GET', pattern: '/profissional-saude/inscricoes/{id}', latencyMs: 250, handler: requestDetail },
  { method: 'POST', pattern: '/profissional-saude/inscricoes/{id}/decisao', latencyMs: 350, handler: decide },
  { method: 'POST', pattern: '/profissional-saude/inscricoes/{id}/pedido-informacao', latencyMs: 350, handler: askInfo },
  { method: 'POST', pattern: '/profissional-saude/inscricoes/{id}/mensagens', latencyMs: 250, handler: sendMessage },

  // Rotas so para exercitar o tratamento de erro da camada de rede.
  { method: 'GET', pattern: '/debug/no-content', latencyMs: 50, handler: () => empty() },
  { method: 'GET', pattern: '/debug/bad-request', latencyMs: 50, handler: (r) => failure(400, 'Parâmetro inválido.', r.path) },
  { method: 'GET', pattern: '/debug/unauthorized', latencyMs: 50, handler: (r) => failure(401, SESSION_EXPIRED, r.path) },
  { method: 'GET', pattern: '/debug/forbidden', latencyMs: 50, handler: (r) => failure(403, 'Sem permissão.', r.path) },
  { method: 'GET', pattern: '/debug/not-found', latencyMs: 50, handler: (r) => failure(404, 'Não encontrado.', r.path) },
  { method: 'GET', pattern: '/debug/conflict', latencyMs: 50, handler: (r) => failure(409, 'Conflito.', r.path) },
  { method: 'GET', pattern: '/debug/too-many', latencyMs: 50, handler: (r) => failure(429, TOO_MANY, r.path) },
  { method: 'GET', pattern: '/debug/server-error', latencyMs: 50, handler: (r) => failure(500, 'Erro inesperado.', r.path) },
]

export const mockRoutes = ROUTES

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** O Blob do jsdom nao tem text(); o FileReader le nos dois ambientes. */
function readBlob(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

async function parseBody(body: BodyInit | null | undefined): Promise<unknown> {
  try {
    if (typeof body === 'string') return JSON.parse(body)
    // Multipart do cadastro: o JSON vem na parte `dados`.
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      const part = body.get('dados')
      if (part === null) return null
      return JSON.parse(typeof part === 'string' ? part : await readBlob(part))
    }
  } catch {
    return null
  }
  return null
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
  const headers = init?.headers
  if (headers === undefined) return null
  if (headers instanceof Headers) return headers.get(name)
  if (Array.isArray(headers)) {
    return headers.find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? null
  }
  const record = headers as Record<string, string>
  const key = Object.keys(record).find((entry) => entry.toLowerCase() === name.toLowerCase())
  return key === undefined ? null : (record[key] ?? null)
}

/** Substitui o fetch. Use latency = false nos testes para nao esperar. */
export function createMockFetch(options: { latency?: boolean } = {}): typeof fetch {
  const useLatency = options.latency ?? true

  return async function mockFetch(input, init) {
    const url = new URL(typeof input === 'string' ? input : String(input))
    const method = (init?.method ?? 'GET') as HttpMethod
    const authorization = headerOf(init, 'Authorization')
    requestLog.push(`${method} ${url.pathname}${url.search}`)
    authorizationLog.push(authorization)

    let route: Route | undefined
    let params: string[] = []
    for (const candidate of ROUTES) {
      if (candidate.method !== method) continue
      const found = paramsOf(candidate.pattern, url.pathname)
      if (found !== null) {
        route = candidate
        params = found
        break
      }
    }

    if (useLatency) await sleep(route?.latencyMs ?? 100)

    const respond = (payload: MockResponse) => {
      // 204 e 304 nao admitem corpo: o construtor de Response recusa.
      const isEmpty = payload.status === 204 || payload.status === 304 || payload.body === null
      return new Response(isEmpty ? null : JSON.stringify(payload.body), {
        status: payload.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (route === undefined) {
      return respond(failure(404, `Rota não encontrada: ${method} ${url.pathname}`, url.pathname))
    }

    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null
    const request: MockRequest = {
      method,
      path: url.pathname,
      query: url.searchParams,
      body: await parseBody(init?.body),
      token,
    }
    return respond(route.handler(request, params))
  }
}
