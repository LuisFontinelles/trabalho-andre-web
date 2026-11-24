import type { TriageQuestion } from '@/domain/opportunityDraft'

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

/**
 * Triagem da oportunidade, como foi salva. Os tipos de pergunta e documento
 * moram no rascunho (opportunityDraft), que e quem os edita.
 */
export interface OpportunityTriage {
  readonly mode: 'PADRAO' | 'PERSONALIZADO'
  readonly questions: readonly TriageQuestion[]
  readonly documents: readonly { readonly id: string; readonly label: string }[]
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
  /** Dados que o formulario nao edita, mas que a edicao precisa devolver. */
  readonly city: string | null
  readonly state: string | null
  readonly audienceNote: string | null
  readonly responseDays: number
  readonly triage: OpportunityTriage
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

/** Os 6 estados da solicitacao, os mesmos do app do paciente. */
export type RequestStatus =
  | 'RECEBIDA'
  | 'EM_ANALISE'
  | 'AGUARDANDO_INFORMACOES'
  | 'APROVADA'
  | 'RECUSADA'
  | 'CANCELADA'

export const REQUEST_STATUSES: readonly RequestStatus[] = [
  'RECEBIDA',
  'EM_ANALISE',
  'AGUARDANDO_INFORMACOES',
  'APROVADA',
  'RECUSADA',
  'CANCELADA',
]

/** Valor desconhecido cai em Recebida: o pedido aparece e pode ser analisado. */
export function requestStatusFrom(raw: string): RequestStatus {
  return REQUEST_STATUSES.find((item) => item === raw) ?? 'RECEBIDA'
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  RECEBIDA: 'Recebida',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_INFORMACOES: 'Aguardando informações',
  APROVADA: 'Aprovada',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada',
}

/** O tom do selo de cada status, como conceito e nao como cor. */
export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger'

export const REQUEST_STATUS_TONE: Record<RequestStatus, StatusTone> = {
  RECEBIDA: 'neutral',
  EM_ANALISE: 'warning',
  AGUARDANDO_INFORMACOES: 'warning',
  APROVADA: 'success',
  RECUSADA: 'danger',
  CANCELADA: 'neutral',
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

/** Prazo padrao para responder, quando a oportunidade nao diz outro. */
export const RESPONSE_DEADLINE_DAYS = 15

export function responseDeadline(
  receivedAt: string,
  days: number = RESPONSE_DEADLINE_DAYS,
): Date | null {
  const received = new Date(receivedAt)
  if (Number.isNaN(received.getTime())) return null
  return new Date(received.getTime() + days * DAY_MS)
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

/** A decisao final que o profissional registra. Ela nao volta atras. */
export type Decision = 'APROVADA' | 'RECUSADA'

export const DECIDABLE_STATUSES: readonly Decision[] = ['APROVADA', 'RECUSADA']

/**
 * Pedido encerrado: aprovado, recusado ou cancelado pelo paciente. Nenhum
 * dos tres aceita aprovar, recusar ou pedir informacao.
 */
export function isDecided(status: RequestStatus): boolean {
  return status === 'APROVADA' || status === 'RECUSADA' || status === 'CANCELADA'
}

/** O pedido ainda espera o profissional, e o prazo de resposta conta. */
export function awaitsProfessional(status: RequestStatus): boolean {
  return status === 'RECEBIDA' || status === 'EM_ANALISE'
}

/**
 * "Atrasada" nao e estado: e Recebida ou Em analise depois do prazo de
 * resposta, como o contrato define.
 */
export function isOverdue(
  item: { status: RequestStatus; deadline: string | null },
  now: Date = new Date(),
): boolean {
  if (!awaitsProfessional(item.status) || item.deadline === null) return false
  const deadline = new Date(item.deadline).getTime()
  return !Number.isNaN(deadline) && deadline < now.getTime()
}

export interface ReceivedRequest {
  readonly id: string
  readonly protocol: string
  readonly patientName: string
  readonly opportunityId: string
  readonly opportunityTitle: string
  readonly receivedAt: string
  /** Prazo de resposta do profissional. */
  readonly deadline: string | null
  readonly status: RequestStatus
  readonly hasUnreadMessage: boolean
  readonly canMessage: boolean
}

/** Os filtros da lista: Todas e um por estado. */
export type RequestFilter = 'TODAS' | RequestStatus

export const REQUEST_FILTERS: readonly RequestFilter[] = ['TODAS', ...REQUEST_STATUSES]

export const REQUEST_FILTER_LABEL: Record<RequestFilter, string> = {
  TODAS: 'Todas',
  RECEBIDA: 'Recebidas',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_INFORMACOES: 'Aguardando informações',
  APROVADA: 'Aprovadas',
  RECUSADA: 'Recusadas',
  CANCELADA: 'Canceladas',
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
  readonly questionId: string
  readonly question: string
  readonly answer: string
}

export interface RequestDocument {
  readonly id: string
  /** Qual dos documentos exigidos este arquivo atende (`rg`, `outro-1`). */
  readonly documentId: string
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
  readonly authorName: string
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

/** O que fica combinado com o paciente na aprovacao. */
export interface Agreement {
  readonly when: string
  readonly where: string
  readonly bring: string
}

export interface InfoRequest {
  readonly text: string
  readonly deadline: string | null
}

export interface RequestDetail extends ReceivedRequest {
  /** Quando a decisao foi tomada (ou o pedido cancelado). */
  readonly decidedAt: string | null
  readonly decisionReason: string | null
  readonly infoRequest: InfoRequest | null
  readonly agreement: Agreement | null
  readonly triage: readonly TriageAnswer[]
  readonly documents: readonly RequestDocument[]
  readonly messages: readonly RequestMessage[]
}

/**
 * A tela de aprovar nao pergunta quando, onde e o que levar. Ate perguntar,
 * a aprovacao combina "A combinar", o local da oportunidade (ou a
 * modalidade, se for online) e os documentos exigidos.
 */
export function defaultAgreement(
  opportunity: ManagedOpportunity | null,
  toArrange: string = 'A combinar',
): Agreement {
  if (opportunity === null) return { when: toArrange, where: toArrange, bring: '' }
  const where =
    requiresAddress(opportunity.modality) && (opportunity.address ?? '').trim() !== ''
      ? (opportunity.address ?? '').trim()
      : CARE_MODALITY_LABEL[opportunity.modality]
  return {
    when: toArrange,
    where,
    bring: opportunity.triage.documents.map((item) => item.label).join(', '),
  }
}
