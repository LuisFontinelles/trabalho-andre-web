/** Espelham exatamente o formato que a API envia. Ver CONTRATO-API-CareBridge.md */

export interface AddressDTO {
  street: string
  neighborhood: string
  zipCode: string
  number: string
  complement: string | null
  city: string
  state: string
}

export interface UserDTO {
  username: string
  email: string
  enabled: boolean
  profile: string
  address: AddressDTO | null
  birthday: string | null
  income: number | null
  concern: string[] | null
  accessConditions: string[] | null
  healthHistory: string | null
  serviceRequests: string[] | null
}

export interface AuthResponseDTO {
  token: string
  expiresIn: number
  user: UserDTO
}

export interface LoginRequestDTO {
  email: string
  password: string
}

export interface LoginResponseDTO {
  token?: string
  autenticado?: boolean
  tipoPerfil?: string
  validadoInstitucionalmente?: boolean
  expiraEmSegundos?: number
}

export interface CurrentUserDTO {
  id: string
  email: string
  tipoPerfil: string
  nome: string
  situacaoRegistro?: string | null
  conselho?: string | null
  uf?: string | null
  numeroRegistro?: string | null
  especialidade?: string | null
  ondeAtende?: string | null
}

export type PendingProfessionalDTO = CurrentUserDTO

export interface ProfessionalRegistrationDTO {
  council: string
  state: string
  number: string
}

export interface SignUpRequestDTO {
  username: string
  email: string
  password: string
  profile: string
  acceptedTerms: boolean
  professional: ProfessionalRegistrationDTO | null
}

export interface ProfessionalHealthSignupDTO {
  tipoPerfil: 'PROFISSIONAL_SAUDE'
  usuarioDto: {
    email: string
    senha: string
    tipoPerfil: 'PROFISSIONAL_SAUDE'
  }
  nome: string
  conselho: string
  uf: string
  numeroRegistro: string
  especialidade: string
  ondeAtende: string
  biografiaOuDescricao: string | null
  acceptedTerms: boolean
}

export interface VerificationChallengeDTO {
  email: string
  profile?: string
  tipoPerfil?: string
  codeLength?: number
  tamanhoCodigo?: number | null
  exigeVerificacao?: boolean
}

export interface VerifyCodeRequestDTO {
  email: string
  code: string
}

export interface ResendCodeRequestDTO {
  email: string
}

export interface FilterOptionDTO {
  id: string
  label: string
}

export interface ProfessionalCatalogDTO {
  councils?: FilterOptionDTO[]
  states?: FilterOptionDTO[]
  especialidades?: { id: string; nome: string }[]
  conselhos?: { sigla: string; profissao: string }[]
  ufs?: string[]
  distanciasKm?: number[]
}

export interface ProviderDTO {
  id: string
  nome: string
  verificado: boolean
}

export interface OpportunityDTO {
  id: string
  titulo: string
  especialidade: string
  modalidade: string
  modalidadeAcesso: string
  vagasTotais: number
  vagasPreenchidas: number
  ofertante: ProviderDTO
  cidade?: string | null
  endereco?: string | null
  distanciaKm?: number | null
  descricao?: string | null
  triagem?: { documentosExigidos?: { id: string; rotulo: string }[] | null } | null
  ultimaAtualizacao: string
}

export interface PageDTO<Item> {
  content: Item[]
  number: number
  size: number
  totalPages: number
  totalElements: number
}

export interface FilterCatalogDTO {
  especialidades: { id: string; nome: string }[]
  distanciasKm: number[]
}

export interface TriageAnswersDTO {
  reason: string
  hasDiagnosis: boolean
  usesContinuousMedication: boolean
  urgency: string
}

export interface TimelineStepDTO {
  title: string
  detail: string
  done: boolean
}

export interface ApplicationDTO {
  id: string
  protocolNumber: string
  opportunityId: string
  status: string
  timeline: TimelineStepDTO[]
}
