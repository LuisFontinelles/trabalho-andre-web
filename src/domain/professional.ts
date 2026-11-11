/**
 * Dominio do profissional: o que ele publica e os pedidos que recebe.
 * Como no resto do dominio, nada aqui conhece React, rede ou DTO, e as
 * decisoes visuais saem como conceito, nao como cor.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export type OpportunityStatus = 'ATIVA' | 'ENCERRADA' | 'RASCUNHO'

export function opportunityStatusFrom(raw: string): OpportunityStatus {
  if (raw === 'ATIVA' || raw === 'ENCERRADA') return raw
  return 'RASCUNHO'
}

export const OPPORTUNITY_STATUS_LABEL: Record<OpportunityStatus, string> = {
  ATIVA: 'Ativa',
  ENCERRADA: 'Encerrada',
  RASCUNHO: 'Rascunho',
}

export type AccessMode = 'gratuito' | 'sus' | 'preco-social' | 'pesquisa'

/** Na ordem em que os cards aparecem no passo Condicoes de acesso. */
export const ACCESS_MODES: readonly AccessMode[] = [
  'gratuito',
  'sus',
  'preco-social',
  'pesquisa',
]

export function accessModeFrom(raw: string): AccessMode {
  if (raw === 'sus' || raw === 'preco-social' || raw === 'pesquisa') return raw
  return 'gratuito'
}

export const ACCESS_MODE_LABEL: Record<AccessMode, string> = {
  gratuito: 'Gratuito',
  sus: 'SUS',
  'preco-social': 'Preço social',
  pesquisa: 'Pesquisa',
}

export const ACCESS_MODE_HINT: Record<AccessMode, string> = {
  gratuito: 'Sem custo ao paciente',
  sus: 'Atendimento pelo SUS',
  'preco-social': 'Valor reduzido',
  pesquisa: 'Participação em estudo',
}

/** Como o atendimento acontece. O hibrido tambem tem endereco. */
export type CareModality = 'presencial' | 'online' | 'hibrido'

export const CARE_MODALITIES: readonly CareModality[] = ['presencial', 'online', 'hibrido']

export function careModalityFrom(raw: string): CareModality {
  if (raw === 'online' || raw === 'hibrido') return raw
  return 'presencial'
}

export const CARE_MODALITY_LABEL: Record<CareModality, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido',
}

/** CEP e endereco so fazem sentido quando ha encontro presencial. */
export function requiresAddress(modality: CareModality | null): boolean {
  return modality === 'presencial' || modality === 'hibrido'
}

export type ServiceType = 'consulta' | 'exame' | 'terapia' | 'procedimento' | 'grupo'

export const SERVICE_TYPES: readonly ServiceType[] = [
  'consulta',
  'exame',
  'terapia',
  'procedimento',
  'grupo',
]

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  consulta: 'Consulta',
  exame: 'Exame',
  terapia: 'Terapia',
  procedimento: 'Procedimento',
  grupo: 'Grupo ou oficina',
}

export function serviceTypeFrom(raw: string | null | undefined): ServiceType | null {
  return SERVICE_TYPES.find((item) => item === raw) ?? null
}

export type Audience = 'criancas' | 'adolescentes' | 'adultos' | 'idosos' | 'gestantes'

export const AUDIENCES: readonly Audience[] = [
  'criancas',
  'adolescentes',
  'adultos',
  'idosos',
  'gestantes',
]

export const AUDIENCE_LABEL: Record<Audience, string> = {
  criancas: 'Crianças',
  adolescentes: 'Adolescentes',
  adultos: 'Adultos',
  idosos: 'Idosos',
  gestantes: 'Gestantes',
}

export function audiencesFrom(raw: readonly string[] | null | undefined): readonly Audience[] {
  return AUDIENCES.filter((item) => (raw ?? []).includes(item))
}

/** Como paciente e profissional combinam o atendimento depois da aprovacao. */
export type ContactMethod = 'plataforma' | 'telefone' | 'email'

export const CONTACT_METHODS: readonly ContactMethod[] = ['plataforma', 'telefone', 'email']

export const CONTACT_METHOD_LABEL: Record<ContactMethod, string> = {
  plataforma: 'Mensagem na plataforma',
  telefone: 'Telefone',
  email: 'E-mail',
}

export function contactMethodFrom(raw: string | null | undefined): ContactMethod | null {
  return CONTACT_METHODS.find((item) => item === raw) ?? null
}

/** So a modalidade de preco social admite valor. Sem escolha, nao admite. */
export function allowsPrice(mode: AccessMode | null): boolean {
  return mode === 'preco-social'
}

export interface ManagedOpportunity {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly serviceType: ServiceType | null
  readonly audiences: readonly Audience[]
  readonly specialtyId: string
  readonly accessMode: AccessMode
  readonly price: number | null
  readonly filledVacancies: number
  readonly totalVacancies: number
  readonly applicationCount: number
  readonly status: OpportunityStatus
  readonly modality: CareModality
  readonly cep: string | null
  readonly address: string | null
  readonly opensAt: string | null
  readonly closesAt: string | null
  readonly eligibility: string
  readonly hasNoRestrictions: boolean
  readonly contactMethod: ContactMethod | null
  readonly updatedAt: string
}

export function vacancySummary(item: ManagedOpportunity): string {
  return `${item.filledVacancies} de ${item.totalVacancies}`
}

export function remainingVacancies(item: ManagedOpportunity): number {
  return Math.max(item.totalVacancies - item.filledVacancies, 0)
}

export function isFull(item: ManagedOpportunity): boolean {
  return remainingVacancies(item) === 0
}

/**
 * Acoes disponiveis por status. Rascunho ainda nao foi publicado, entao nao
 * ha o que encerrar; encerrada ja acabou, entao encerrar de novo nao faz
 * sentido. A tela le isso em vez de repetir a regra.
 */
export function canEdit(item: ManagedOpportunity): boolean {
  return item.status !== 'ENCERRADA'
}

export function canClose(item: ManagedOpportunity): boolean {
  return item.status === 'ATIVA'
}

/** So rascunho pode ser excluido: ele nunca recebeu solicitacao. */
export function canDelete(item: ManagedOpportunity): boolean {
  return item.status === 'RASCUNHO'
}

export interface OpportunitySummary {
  readonly activeCount: number
  readonly requestCount: number
  readonly acceptedCount: number
}

export function summarize(
  items: readonly ManagedOpportunity[],
  acceptedCount: number,
): OpportunitySummary {
  return {
    activeCount: items.filter((item) => item.status === 'ATIVA').length,
    requestCount: items.reduce((total, item) => total + item.applicationCount, 0),
    acceptedCount,
  }
}

export type RequestStatus =
  | 'NOVA'
  | 'EM_ANALISE'
  | 'AGUARDANDO_INFO'
  | 'APROVADA'
  | 'RECUSADA'

export function requestStatusFrom(raw: string): RequestStatus {
  if (
    raw === 'EM_ANALISE' ||
    raw === 'AGUARDANDO_INFO' ||
    raw === 'APROVADA' ||
    raw === 'RECUSADA'
  ) {
    return raw
  }
  return 'NOVA'
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  NOVA: 'Nova',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_INFO: 'Aguardando informações',
  APROVADA: 'Aprovada',
  RECUSADA: 'Recusada',
}

/** O tom do selo de cada status, como conceito e nao como cor. */
export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger'

export const REQUEST_STATUS_TONE: Record<RequestStatus, StatusTone> = {
  NOVA: 'neutral',
  EM_ANALISE: 'warning',
  AGUARDANDO_INFO: 'warning',
  APROVADA: 'success',
  RECUSADA: 'danger',
}

export const OPPORTUNITY_STATUS_TONE: Record<OpportunityStatus, StatusTone> = {
  ATIVA: 'success',
  RASCUNHO: 'warning',
  ENCERRADA: 'neutral',
}

/** A recusa exige um motivo, que o paciente le. */
export const MIN_REASON_LENGTH = 10

export function isValidReason(text: string): boolean {
  return text.trim().length >= MIN_REASON_LENGTH
}

/** Prazo que o profissional tem para responder a uma solicitacao. */
export const RESPONSE_DEADLINE_DAYS = 15

export function responseDeadline(receivedAt: string): Date | null {
  const received = new Date(receivedAt)
  if (Number.isNaN(received.getTime())) return null
  return new Date(received.getTime() + RESPONSE_DEADLINE_DAYS * DAY_MS)
}

export function shortDate(value: Date | string | null): string {
  if (value === null) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

/** Os status que o profissional pode escolher na tela de decisao. */
export const DECIDABLE_STATUSES: readonly RequestStatus[] = [
  'EM_ANALISE',
  'APROVADA',
  'RECUSADA',
]

export function isDecided(status: RequestStatus): boolean {
  return status === 'APROVADA' || status === 'RECUSADA'
}

export interface ReceivedRequest {
  readonly id: string
  readonly patientName: string
  readonly opportunityId: string
  readonly opportunityTitle: string
  readonly receivedAt: string
  readonly status: RequestStatus
  readonly hasUnreadMessage: boolean
  readonly canMessage: boolean
}

/** Os filtros da lista. Quem aguarda informacoes aparece em Todas. */
export type RequestFilter = 'TODAS' | Exclude<RequestStatus, 'AGUARDANDO_INFO'>

export const REQUEST_FILTERS: readonly RequestFilter[] = [
  'TODAS',
  'NOVA',
  'EM_ANALISE',
  'APROVADA',
  'RECUSADA',
]

export const REQUEST_FILTER_LABEL: Record<RequestFilter, string> = {
  TODAS: 'Todas',
  NOVA: 'Novas',
  EM_ANALISE: 'Em análise',
  APROVADA: 'Aprovada',
  RECUSADA: 'Recusada',
}

export function filterRequests(
  items: readonly ReceivedRequest[],
  filter: RequestFilter,
): readonly ReceivedRequest[] {
  if (filter === 'TODAS') return items
  return items.filter((item) => item.status === filter)
}

export function countByFilter(
  items: readonly ReceivedRequest[],
  filter: RequestFilter,
): number {
  return filterRequests(items, filter).length
}

/**
 * "Hoje", "Ontem", "Há 3 dias". O protótipo mostra tempo relativo, e a regra
 * fica aqui para a tela nao recalcular data.
 */
export function relativeDay(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const startOf = (date: Date) =>
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const days = Math.round((startOf(now) - startOf(then)) / DAY_MS)
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  return `Há ${days} dias`
}

export interface TriageAnswer {
  readonly question: string
  readonly answer: string
}

export interface RequestDocument {
  readonly id: string
  readonly name: string
  readonly sizeKb: number
  readonly sentAt: string | null
}

/** "JPG", "PDF": a extensao do arquivo, para o resumo do documento. */
export function documentKind(document: RequestDocument): string {
  const dot = document.name.lastIndexOf('.')
  return dot < 0 ? '' : document.name.slice(dot + 1).toUpperCase()
}

/** "420 KB" ou "1,2 MB", como o resumo do documento mostra. */
export function documentSize(document: RequestDocument): string {
  if (document.sizeKb < 1024) return `${document.sizeKb} KB`
  return `${(document.sizeKb / 1024).toFixed(1).replace('.', ',')} MB`
}

/** Mensagens so depois da aprovacao, como o painel avisa. */
export function canExchangeMessages(status: RequestStatus): boolean {
  return status === 'APROVADA'
}

export type MessageAuthor = 'PACIENTE' | 'PROFISSIONAL'

export interface RequestMessage {
  readonly id: string
  readonly author: MessageAuthor
  readonly text: string
  readonly sentAt: string
}

export function isFromProfessional(message: RequestMessage): boolean {
  return message.author === 'PROFISSIONAL'
}

export function messageTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

export interface RequestDetail {
  readonly id: string
  readonly patientName: string
  readonly opportunityId: string
  readonly opportunityTitle: string
  readonly receivedAt: string
  readonly status: RequestStatus
  readonly protocol: string
  /** Quando a decisao foi tomada, para o aviso de aprovada. */
  readonly decidedAt: string | null
  readonly triage: readonly TriageAnswer[]
  readonly documents: readonly RequestDocument[]
  readonly messages: readonly RequestMessage[]
}
