/** Entidades de dominio. Nao conhecem React, rede nem DTO. */

export type UserProfile = 'PACIENTE' | 'PROFISSIONAL' | 'DESCONHECIDO'
export type AuthProfile = 'PACIENTE' | 'PROFISSIONAL_SAUDE' | 'ADMIN' | 'DESCONHECIDO'

export function authProfileFrom(raw: string): AuthProfile {
  if (raw === 'PACIENTE' || raw === 'PROFISSIONAL_SAUDE' || raw === 'ADMIN') return raw
  return 'DESCONHECIDO'
}

export function userProfileFrom(raw: string): UserProfile {
  if (raw === 'PACIENTE' || raw === 'PROFISSIONAL') return raw
  return 'DESCONHECIDO'
}

export interface User {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly profile: UserProfile
}

export function firstName(user: User): string {
  return user.name.split(' ')[0] ?? user.name
}

export interface Session {
  readonly token: string
  readonly user: User
  readonly authProfile: AuthProfile
  /** Se o registro profissional ja foi conferido (o selo de verificado). */
  readonly isVerified: boolean
  /** "CRM/DF 123456", quando o GET /user/me traz o registro. */
  readonly registration?: string
}

/** Profissional aguardando a decisão de um administrador. */
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

/** A conta existe, mas nao e do perfil que este app atende. */
export class WrongProfileError extends Error {
  readonly profile: UserProfile

  constructor(profile: UserProfile) {
    super(`Perfil ${profile} nao acessa o painel`)
    this.name = 'WrongProfileError'
    this.profile = profile
  }
}

/** Cadastro aceito pelo servidor, aguardando o codigo enviado por e-mail. */
export interface PendingVerification {
  readonly email: string
  readonly profile: UserProfile
  readonly codeLength: number
  /**
   * Falso quando a conta ja nasce ativa: o app entra com a senha recem-criada
   * em vez de abrir a tela do codigo.
   */
  readonly requiresCode: boolean
}

export const DEFAULT_CODE_LENGTH = 4

export interface ProfessionalRegistration {
  councilId: string | null
  stateId: string | null
  number: string
  /** Especialidade principal, do catalogo. Opcional no cadastro. */
  specialtyId: string | null
  /** Clinica, hospital ou instituicao. Opcional no cadastro. */
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

/** GET /catalogos: o que cadastro e nova oportunidade oferecem para escolher. */
export interface Catalog {
  readonly specialties: readonly FilterOption[]
  readonly councils: readonly FilterOption[]
  readonly states: readonly FilterOption[]
}

export const EMPTY_CATALOG: Catalog = {
  specialties: [],
  councils: [],
  states: [],
}
