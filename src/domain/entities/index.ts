/** Entidades de dominio. Nao conhecem React, rede nem DTO. */

export type UserProfile = 'PACIENTE' | 'PROFISSIONAL' | 'DESCONHECIDO'
export type AuthProfile =
  | 'PACIENTE'
  | 'PROFISSIONAL_SAUDE'
  | 'ADMIN'
  | 'DESCONHECIDO'

export function authProfileFrom(raw: string): AuthProfile {
  if (raw === 'PACIENTE' || raw === 'PROFISSIONAL_SAUDE' || raw === 'ADMIN') return raw
  return 'DESCONHECIDO'
}

export function userProfileFrom(raw: string): UserProfile {
  if (raw === 'PACIENTE' || raw === 'PROFISSIONAL') return raw
  if (raw === 'PROFISSIONAL_SAUDE') return 'PROFISSIONAL'
  return 'DESCONHECIDO'
}

export interface User {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly profile: UserProfile
  readonly city: string | null
}

export function firstName(user: User): string {
  return user.name.split(' ')[0] ?? user.name
}

export interface Session {
  readonly token: string
  readonly user: User
  readonly tipoPerfil: AuthProfile
  readonly validadoInstitucionalmente: boolean
}

export interface LoginResult {
  readonly status: number
  readonly data: {
    readonly autenticado?: boolean
    readonly token?: string
    readonly tipoPerfil?: string
    readonly validadoInstitucionalmente?: boolean
  }
}

export type RegistrationStatus = 'EM_VERIFICACAO' | 'VERIFICADO' | 'RECUSADO' | null

export interface CurrentUser {
  readonly id: string
  readonly email: string
  readonly tipoPerfil: AuthProfile
  readonly nome: string
  readonly situacaoRegistro: RegistrationStatus
  readonly conselho: string | null
  readonly uf: string | null
  readonly numeroRegistro: string | null
  readonly especialidade: string | null
  readonly ondeAtende: string | null
}

/** Cadastro aceito pelo servidor, aguardando o codigo enviado por e-mail. */
export interface PendingProfessional {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly council: string
  readonly state: string
  readonly registrationNumber: string
  readonly specialty: string
  readonly workplace: string
}

export interface PendingVerification {
  readonly email: string
  readonly profile: UserProfile
  readonly codeLength: number
}

export const DEFAULT_CODE_LENGTH = 6

export interface ProfessionalRegistration {
  councilId: string | null
  stateId: string | null
  number: string
  specialtyId: string | null
  workplace: string
}

export function emptyProfessionalRegistration(): ProfessionalRegistration {
  return { councilId: null, stateId: null, number: '', specialtyId: null, workplace: '' }
}

export interface SignUpDraft {
  profile: UserProfile
  name: string
  email: string
  password: string
  confirmPassword: string
  professional: ProfessionalRegistration
  acceptedTerms: boolean
}

export function emptySignUpDraft(): SignUpDraft {
  return {
    profile: 'PROFISSIONAL',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    professional: emptyProfessionalRegistration(),
    acceptedTerms: false,
  }
}

export function requiresProfessionalData(draft: SignUpDraft): boolean {
  return draft.profile === 'PROFISSIONAL'
}

export interface FilterOption {
  readonly id: string
  readonly label: string
}

export interface ProfessionalCatalog {
  readonly councils: readonly FilterOption[]
  readonly states: readonly FilterOption[]
  readonly specialties: readonly FilterOption[]
}

export const EMPTY_PROFESSIONAL_CATALOG: ProfessionalCatalog = {
  councils: [],
  states: [],
  specialties: [],
}

/**
 * O contrato permite que o catálogo seja estático. Mantemos a mesma lista do
 * backend para o cadastro continuar disponível quando o Render estiver
 * iniciando ou temporariamente indisponível.
 */
export const FALLBACK_PROFESSIONAL_CATALOG: ProfessionalCatalog = {
  councils: [
    { id: 'CRM', label: 'CRM — Medicina' },
    { id: 'COREN', label: 'COREN — Enfermagem' },
    { id: 'CRO', label: 'CRO — Odontologia' },
    { id: 'CRP', label: 'CRP — Psicologia' },
    { id: 'CREFITO', label: 'CREFITO — Fisioterapia e TO' },
    { id: 'CRN', label: 'CRN — Nutrição' },
    { id: 'CRF', label: 'CRF — Farmácia' },
    { id: 'CREFONO', label: 'CREFONO — Fonoaudiologia' },
    { id: 'CRESS', label: 'CRESS — Serviço social' },
    { id: 'CREF', label: 'CREF — Educação física' },
    { id: 'CRBM', label: 'CRBM — Biomedicina' },
  ],
  states: [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
    'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
  ].map((state) => ({ id: state, label: state })),
  specialties: [
    { id: 'cardiologia', label: 'Cardiologia' },
    { id: 'clinica-geral', label: 'Clínica geral' },
    { id: 'fisioterapia', label: 'Fisioterapia' },
    { id: 'fonoaudiologia', label: 'Fonoaudiologia' },
    { id: 'nutricao', label: 'Nutrição' },
    { id: 'odontologia', label: 'Odontologia' },
    { id: 'ortopedia', label: 'Ortopedia' },
    { id: 'psicologia', label: 'Psicologia' },
    { id: 'terapia-ocupacional', label: 'Terapia ocupacional' },
  ],
}

export type Modality = 'presencial' | 'online'
export type OfferType = 'gratuita' | 'social' | 'convenio'

export function modalityFrom(raw: string): Modality {
  return raw.toUpperCase() === 'ONLINE' ? 'online' : 'presencial'
}

export function offerTypeFrom(raw: string): OfferType {
  const normalized = raw.toUpperCase()
  if (normalized === 'PRECO_SOCIAL' || raw === 'social') return 'social'
  if (raw === 'convenio') return 'convenio'
  return 'gratuita'
}

export const MODALITY_LABEL: Record<Modality, string> = {
  presencial: 'Presencial',
  online: 'Online',
}

export const OFFER_TYPE_LABEL: Record<OfferType, string> = {
  gratuita: 'Gratuita',
  social: 'Social',
  convenio: 'Convênio',
}

export interface Provider {
  readonly id: string
  readonly name: string
  readonly isVerified: boolean
}

export type VacancyLevel = 'none' | 'low' | 'plenty'

export interface Opportunity {
  readonly id: string
  readonly title: string
  readonly specialtyId: string
  readonly modality: Modality
  readonly offerType: OfferType
  readonly vacancies: number
  readonly provider: Provider
  readonly city: string
  readonly address: string | null
  readonly distanceKm: number | null
  readonly summary: string
  readonly requiredDocuments: readonly string[]
  readonly updatedAt: string
}

export function hasVacancies(item: Opportunity): boolean {
  return item.vacancies > 0
}

export function vacancyLevel(item: Opportunity): VacancyLevel {
  if (item.vacancies === 0) return 'none'
  return item.vacancies <= 5 ? 'low' : 'plenty'
}

const distanceFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function opportunitySubtitle(item: Opportunity): string {
  if (item.distanceKm !== null) {
    return `${item.provider.name} · ${distanceFormatter.format(item.distanceKm)} km`
  }
  return `${item.provider.name} · ${MODALITY_LABEL[item.modality]}`
}

export interface OpportunityPage {
  readonly items: readonly Opportunity[]
  readonly page: number
  readonly totalPages: number
  readonly totalItems: number
}

export const EMPTY_PAGE: OpportunityPage = {
  items: [],
  page: 1,
  totalPages: 1,
  totalItems: 0,
}

export interface SearchCriteria {
  term: string
  specialties: readonly string[]
  modalities: readonly string[]
  offerTypes: readonly string[]
  distance: string | null
  page: number
}

export function emptyCriteria(): SearchCriteria {
  return {
    term: '',
    specialties: [],
    modalities: [],
    offerTypes: [],
    distance: null,
    page: 1,
  }
}

export function activeFilterCount(criteria: SearchCriteria): number {
  return (
    criteria.specialties.length +
    criteria.modalities.length +
    criteria.offerTypes.length +
    (criteria.distance === null ? 0 : 1)
  )
}

export function isFiltered(criteria: SearchCriteria): boolean {
  return activeFilterCount(criteria) > 0 || criteria.term !== ''
}

/** Query que o servidor vai receber. Listas vao ordenadas para o cache ser estavel. */
export function queryItems(criteria: SearchCriteria): Record<string, string> {
  const query: Record<string, string> = { page: String(Math.max(criteria.page - 1, 0)), size: '6' }
  if (criteria.term !== '') query.q = criteria.term
  if (criteria.specialties.length > 0)
    query.especialidade = [...criteria.specialties].sort().join(',')
  if (criteria.modalities.length > 0)
    query.modalidade = [...criteria.modalities].map((item) => item.toUpperCase()).sort().join(',')
  if (criteria.offerTypes.length > 0)
    query.modalidadeAcesso = [...criteria.offerTypes]
      .map((item) => item === 'social' ? 'PRECO_SOCIAL' : item.toUpperCase())
      .sort()
      .join(',')
  if (criteria.distance !== null) query.distanciaMaxKm = criteria.distance
  return query
}

export interface FilterCatalog {
  readonly specialties: readonly FilterOption[]
  readonly modalities: readonly FilterOption[]
  readonly distances: readonly FilterOption[]
  readonly offerTypes: readonly FilterOption[]
}

export const EMPTY_FILTER_CATALOG: FilterCatalog = {
  specialties: [],
  modalities: [],
  distances: [],
  offerTypes: [],
}

export type Urgency = 'low' | 'medium' | 'high'

export const URGENCY_LABEL: Record<Urgency, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

export interface TriageAnswers {
  readonly reason: string
  readonly hasDiagnosis: boolean
  readonly usesContinuousMedication: boolean
  readonly urgency: Urgency
}

export interface ApplicationStep {
  readonly title: string
  readonly detail: string
  readonly isDone: boolean
}

export interface Application {
  readonly id: string
  readonly protocolNumber: string
  readonly opportunityId: string
  readonly status: string
  readonly steps: readonly ApplicationStep[]
}
