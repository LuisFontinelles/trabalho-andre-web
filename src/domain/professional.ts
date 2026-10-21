/**
 * Dominio do profissional: o que ele publica e os pedidos que recebe.
 * Como no resto do dominio, nada aqui conhece React, rede ou DTO, e as
 * decisoes visuais saem como conceito, nao como cor.
 */

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

export type AccessMode = 'gratuito' | 'preco-social' | 'pesquisa'

export function accessModeFrom(raw: string): AccessMode {
  if (raw === 'preco-social' || raw === 'pesquisa') return raw
  return 'gratuito'
}

export const ACCESS_MODE_LABEL: Record<AccessMode, string> = {
  gratuito: 'Gratuito',
  'preco-social': 'Preco social',
  pesquisa: 'Pesquisa',
}

export const ACCESS_MODE_HINT: Record<AccessMode, string> = {
  gratuito: 'Sem custo ao paciente',
  'preco-social': 'Valor reduzido',
  pesquisa: 'Participacao em estudo',
}

/** So a modalidade de preco social admite valor. Sem escolha, nao admite. */
export function allowsPrice(mode: AccessMode | null): boolean {
  return mode === 'preco-social'
}

export interface ManagedOpportunity {
  readonly id: string
  readonly title: string
  readonly specialtyId: string
  readonly accessMode: AccessMode
  readonly price: number | null
  readonly filledVacancies: number
  readonly totalVacancies: number
  readonly applicationCount: number
  readonly status: OpportunityStatus
  readonly modality: 'presencial' | 'online'
  readonly address: string | null
  readonly opensAt: string | null
  readonly closesAt: string | null
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

export function canDelete(): boolean {
  return true
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

export type RequestStatus = 'NOVA' | 'EM_ANALISE' | 'APROVADA' | 'RECUSADA'

export function requestStatusFrom(raw: string): RequestStatus {
  if (raw === 'EM_ANALISE' || raw === 'APROVADA' || raw === 'RECUSADA') return raw
  return 'NOVA'
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  NOVA: 'Nova',
  EM_ANALISE: 'Em analise',
  APROVADA: 'Aprovada',
  RECUSADA: 'Recusada',
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

export type RequestFilter = 'TODAS' | RequestStatus

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
  EM_ANALISE: 'Em analise',
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

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * "Hoje", "Ontem", "3 dias". O protótipo mostra tempo relativo, e a regra
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
  return `${days} dias`
}

export interface TriageAnswer {
  readonly question: string
  readonly answer: string
}

export interface RequestDocument {
  readonly id: string
  readonly name: string
  readonly sizeKb: number
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
  readonly triage: readonly TriageAnswer[]
  readonly documents: readonly RequestDocument[]
  readonly messages: readonly RequestMessage[]
}
