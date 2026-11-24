import {
  modalityFrom,
  offerTypeFrom,
  authProfileFrom,
  userProfileFrom,
  FALLBACK_PROFESSIONAL_CATALOG,
  type Application,
  type CurrentUser,
  type FilterCatalog,
  type LoginResult,
  type FilterOption,
  type Opportunity,
  type OpportunityPage,
  type PendingVerification,
  type PendingProfessional,
  type ProfessionalCatalog,
  type Provider,
  type Session,
  type SignUpDraft,
  type User,
} from '@/domain/entities'
import type {
  ApplicationDTO,
  AuthResponseDTO,
  CurrentUserDTO,
  FilterCatalogDTO,
  FilterOptionDTO,
  LoginResponseDTO,
  OpportunityDTO,
  PageDTO,
  PendingProfessionalDTO,
  ProfessionalCatalogDTO,
  ProfessionalHealthSignupDTO,
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
  const tipoPerfil =
    dto.user.profile === 'PROFISSIONAL'
      ? 'PROFISSIONAL_SAUDE'
      : authProfileFrom(dto.user.profile)
  return {
    token: dto.token,
    user: userFromDTO(dto.user),
    tipoPerfil,
    validadoInstitucionalmente: tipoPerfil === 'PROFISSIONAL_SAUDE',
  }
}

export function loginResultFromDTO(
  dto: LoginResponseDTO,
  status: number,
): LoginResult {
  return { status, data: dto }
}

export function currentUserFromDTO(dto: CurrentUserDTO): CurrentUser {
  const status =
    dto.situacaoRegistro === 'EM_VERIFICACAO' ||
    dto.situacaoRegistro === 'VERIFICADO' ||
    dto.situacaoRegistro === 'RECUSADO'
      ? dto.situacaoRegistro
      : null
  return {
    id: dto.id,
    email: dto.email,
    tipoPerfil: authProfileFrom(dto.tipoPerfil),
    nome: dto.nome,
    situacaoRegistro: status,
    conselho: dto.conselho ?? null,
    uf: dto.uf ?? null,
    numeroRegistro: dto.numeroRegistro ?? null,
    especialidade: dto.especialidade ?? null,
    ondeAtende: dto.ondeAtende ?? null,
  }
}

export function pendingProfessionalFromDTO(
  dto: PendingProfessionalDTO,
): PendingProfessional {
  return {
    id: dto.id,
    email: dto.email,
    name: dto.nome,
    council: dto.conselho ?? '',
    state: dto.uf ?? '',
    registrationNumber: dto.numeroRegistro ?? '',
    specialty: dto.especialidade ?? '',
    workplace: dto.ondeAtende ?? '',
  }
}

export function providerFromDTO(dto: ProviderDTO): Provider {
  return { id: dto.id, name: dto.nome, isVerified: dto.verificado }
}

export function opportunityFromDTO(dto: OpportunityDTO): Opportunity {
  return {
    id: dto.id,
    title: dto.titulo,
    specialtyId: dto.especialidade,
    modality: modalityFrom(dto.modalidade),
    offerType: offerTypeFrom(dto.modalidadeAcesso),
    vacancies: Math.max(dto.vagasTotais - dto.vagasPreenchidas, 0),
    provider: providerFromDTO(dto.ofertante),
    city: dto.cidade ?? '',
    address: dto.endereco ?? null,
    distanceKm: dto.distanciaKm ?? null,
    summary: dto.descricao ?? '',
    requiredDocuments: dto.triagem?.documentosExigidos?.map((item) => item.rotulo) ?? [],
    updatedAt: dto.ultimaAtualizacao,
  }
}

export function opportunityPageFromDTO(
  dto: PageDTO<OpportunityDTO>,
): OpportunityPage {
  return {
    items: dto.content.map(opportunityFromDTO),
    page: dto.number + 1,
    totalPages: dto.totalPages,
    totalItems: dto.totalElements,
  }
}

export function filterOptionFromDTO(dto: FilterOptionDTO): FilterOption {
  return { id: dto.id, label: dto.label }
}

export function filterCatalogFromDTO(dto: FilterCatalogDTO): FilterCatalog {
  return {
    specialties: dto.especialidades.map((item) => ({ id: item.id, label: item.nome })),
    modalities: [
      { id: 'presencial', label: 'Presencial' },
      { id: 'online', label: 'Online' },
      { id: 'hibrido', label: 'Híbrido' },
    ],
    distances: dto.distanciasKm.map((item) => ({ id: String(item), label: `Até ${item} km` })),
    offerTypes: [
      { id: 'gratuita', label: 'Gratuito' },
      { id: 'sus', label: 'SUS' },
      { id: 'social', label: 'Preço social' },
      { id: 'pesquisa', label: 'Pesquisa' },
    ],
  }
}

export function professionalCatalogFromDTO(
  dto: ProfessionalCatalogDTO,
): ProfessionalCatalog {
  const councils =
    dto.conselhos?.map((item) => ({
      id: item.sigla,
      label: item.profissao ? `${item.sigla} — ${item.profissao}` : item.sigla,
    })) ?? dto.councils?.map(filterOptionFromDTO) ?? []
  const states =
    dto.ufs?.map((item) => ({ id: item, label: item })) ??
    dto.states?.map(filterOptionFromDTO) ??
    []
  const specialties =
    dto.especialidades?.map((item) => ({ id: item.id, label: item.nome })) ?? []

  return {
    councils:
      councils.length > 0 ? councils : FALLBACK_PROFESSIONAL_CATALOG.councils,
    states: states.length > 0 ? states : FALLBACK_PROFESSIONAL_CATALOG.states,
    specialties:
      specialties.length > 0 ? specialties : FALLBACK_PROFESSIONAL_CATALOG.specialties,
  }
}

export function pendingVerificationFromDTO(
  dto: VerificationChallengeDTO,
): PendingVerification {
  return {
    email: dto.email,
    profile: userProfileFrom(dto.tipoPerfil ?? dto.profile ?? ''),
    codeLength: dto.tamanhoCodigo ?? dto.codeLength ?? 6,
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

export function professionalHealthSignupToDTO(
  draft: SignUpDraft,
  biographyOrDescription: string,
): ProfessionalHealthSignupDTO {
  const { councilId, stateId, number } = draft.professional
  return {
    tipoPerfil: 'PROFISSIONAL_SAUDE',
    usuarioDto: {
      email: draft.email,
      senha: draft.password,
      tipoPerfil: 'PROFISSIONAL_SAUDE',
    },
    nome: draft.name,
    conselho: councilId ?? '',
    uf: stateId ?? '',
    numeroRegistro: number,
    especialidade: draft.professional.specialtyId ?? '',
    ondeAtende: draft.professional.workplace,
    biografiaOuDescricao: biographyOrDescription || null,
    acceptedTerms: draft.acceptedTerms,
  }
}
