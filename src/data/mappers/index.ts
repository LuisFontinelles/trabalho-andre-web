import {
  modalityFrom,
  offerTypeFrom,
  userProfileFrom,
  type Application,
  type FilterCatalog,
  type FilterOption,
  type Opportunity,
  type OpportunityPage,
  type PendingVerification,
  type ProfessionalCatalog,
  type Provider,
  type Session,
  type SignUpDraft,
  type User,
} from '@/domain/entities'
import type {
  ApplicationDTO,
  AuthResponseDTO,
  FilterCatalogDTO,
  FilterOptionDTO,
  OpportunityDTO,
  PageDTO,
  ProfessionalCatalogDTO,
  ProviderDTO,
  SignUpRequestDTO,
  UserDTO,
  VerificationChallengeDTO,
} from '@/data/dto'

export function userFromDTO(dto: UserDTO): User {
  return {
    id: dto.email,
    name: dto.username,
    email: dto.email,
    profile: userProfileFrom(dto.profile),
    city: dto.address?.city ?? null,
  }
}

export function sessionFromDTO(dto: AuthResponseDTO): Session {
  return { token: dto.token, user: userFromDTO(dto.user) }
}

export function providerFromDTO(dto: ProviderDTO): Provider {
  return { id: dto.id, name: dto.name, isVerified: dto.verified }
}

export function opportunityFromDTO(dto: OpportunityDTO): Opportunity {
  return {
    id: dto.id,
    title: dto.title,
    specialtyId: dto.specialty,
    modality: modalityFrom(dto.modality),
    offerType: offerTypeFrom(dto.offerType),
    vacancies: dto.vacancies,
    provider: providerFromDTO(dto.provider),
    city: dto.location.city,
    address: dto.location.address,
    distanceKm: dto.location.distanceKm,
    summary: dto.summary ?? '',
    requiredDocuments: dto.requiredDocuments ?? [],
    updatedAt: dto.updatedAt,
  }
}

export function opportunityPageFromDTO(
  dto: PageDTO<OpportunityDTO>,
): OpportunityPage {
  return {
    items: dto.items.map(opportunityFromDTO),
    page: dto.page,
    totalPages: dto.totalPages,
    totalItems: dto.totalItems,
  }
}

export function filterOptionFromDTO(dto: FilterOptionDTO): FilterOption {
  return { id: dto.id, label: dto.label }
}

export function filterCatalogFromDTO(dto: FilterCatalogDTO): FilterCatalog {
  return {
    specialties: dto.specialties.map(filterOptionFromDTO),
    modalities: dto.modalities.map(filterOptionFromDTO),
    distances: dto.distances.map(filterOptionFromDTO),
    offerTypes: dto.offerTypes.map(filterOptionFromDTO),
  }
}

export function professionalCatalogFromDTO(
  dto: ProfessionalCatalogDTO,
): ProfessionalCatalog {
  return {
    councils: dto.councils.map(filterOptionFromDTO),
    states: dto.states.map(filterOptionFromDTO),
  }
}

export function pendingVerificationFromDTO(
  dto: VerificationChallengeDTO,
): PendingVerification {
  return {
    email: dto.email,
    profile: userProfileFrom(dto.profile),
    codeLength: dto.codeLength,
  }
}

export function applicationFromDTO(dto: ApplicationDTO): Application {
  return {
    id: dto.id,
    protocolNumber: dto.protocolNumber,
    opportunityId: dto.opportunityId,
    status: dto.status,
    steps: dto.timeline.map((step) => ({
      title: step.title,
      detail: step.detail,
      isDone: step.done,
    })),
  }
}

export function signUpDraftToDTO(draft: SignUpDraft): SignUpRequestDTO {
  const isProfessional = draft.profile === 'PROFISSIONAL'
  return {
    username: draft.name,
    email: draft.email,
    password: draft.password,
    profile: draft.profile,
    acceptedTerms: draft.acceptedTerms,
    professional: isProfessional
      ? {
          council: draft.professional.councilId ?? '',
          state: draft.professional.stateId ?? '',
          number: draft.professional.number,
        }
      : null,
  }
}
