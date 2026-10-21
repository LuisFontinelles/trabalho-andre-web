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

export interface VerificationChallengeDTO {
  email: string
  profile: string
  codeLength: number
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
  councils: FilterOptionDTO[]
  states: FilterOptionDTO[]
}

export interface ProviderDTO {
  id: string
  name: string
  kind: string
  verified: boolean
}

export interface LocationDTO {
  city: string
  state: string
  address: string | null
  distanceKm: number | null
}

export interface OpportunityDTO {
  id: string
  title: string
  specialty: string
  modality: string
  offerType: string
  vacancies: number
  provider: ProviderDTO
  location: LocationDTO
  summary: string | null
  requiredDocuments: string[] | null
  updatedAt: string
}

export interface PageDTO<Item> {
  items: Item[]
  page: number
  totalPages: number
  totalItems: number
}

export interface FilterCatalogDTO {
  specialties: FilterOptionDTO[]
  modalities: FilterOptionDTO[]
  distances: FilterOptionDTO[]
  offerTypes: FilterOptionDTO[]
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
