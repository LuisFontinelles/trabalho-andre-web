import {
  accessModeFrom,
  audiencesFrom,
  careModalityFrom,
  contactMethodFrom,
  opportunityStatusFrom,
  requestStatusFrom,
  requiresAddress,
  serviceTypeFrom,
  type ManagedOpportunity,
  type ReceivedRequest,
  type RequestDetail,
  type RequestMessage,
} from '@/domain/professional'
import {
  allowsPrice,
} from '@/domain/professional'
import type { OpportunityDraft } from '@/domain/opportunityDraft'
import {
  digitsOf,
  emptyOpportunityDraft,
  formatCep,
  parsePrice,
  parseVacancies,
  selectedDocuments,
} from '@/domain/opportunityDraft'
import type {
  CreateOpportunityRequestDTO,
  ManagedOpportunityDTO,
  ReceivedRequestDTO,
  RequestDetailDTO,
  RequestMessageDTO,
} from '@/data/professionalDto'

export function managedOpportunityFromDTO(
  dto: ManagedOpportunityDTO,
): ManagedOpportunity {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? '',
    serviceType: serviceTypeFrom(dto.serviceType),
    audiences: audiencesFrom(dto.audiences),
    specialtyId: dto.specialty,
    accessMode: accessModeFrom(dto.accessMode),
    price: dto.price,
    filledVacancies: dto.filledVacancies,
    totalVacancies: dto.totalVacancies,
    applicationCount: dto.applicationCount,
    status: opportunityStatusFrom(dto.status),
    modality: careModalityFrom(dto.modality),
    cep: dto.cep ?? null,
    address: dto.address,
    opensAt: dto.opensAt,
    closesAt: dto.closesAt,
    eligibility: dto.eligibility ?? '',
    hasNoRestrictions: dto.noRestrictions ?? false,
    contactMethod: contactMethodFrom(dto.contactMethod),
    updatedAt: dto.updatedAt,
  }
}

export function receivedRequestFromDTO(dto: ReceivedRequestDTO): ReceivedRequest {
  return {
    id: dto.id,
    patientName: dto.patientName,
    opportunityId: dto.opportunityId,
    opportunityTitle: dto.opportunityTitle,
    receivedAt: dto.receivedAt,
    status: requestStatusFrom(dto.status),
    hasUnreadMessage: dto.hasUnreadMessage,
    canMessage: dto.canMessage,
  }
}

export function requestMessageFromDTO(dto: RequestMessageDTO): RequestMessage {
  return {
    id: dto.id,
    author: dto.author === 'PROFISSIONAL' ? 'PROFISSIONAL' : 'PACIENTE',
    text: dto.text,
    sentAt: dto.sentAt,
  }
}

export function requestDetailFromDTO(dto: RequestDetailDTO): RequestDetail {
  return {
    id: dto.id,
    patientName: dto.patientName,
    opportunityId: dto.opportunityId,
    opportunityTitle: dto.opportunityTitle,
    receivedAt: dto.receivedAt,
    status: requestStatusFrom(dto.status),
    // Sem protocolo do servidor, os digitos do id identificam o pedido.
    protocol: dto.protocol ?? digitsOf(dto.id),
    decidedAt: dto.decidedAt ?? null,
    triage: dto.triage.map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
    documents: dto.documents.map((item) => ({
      id: item.id,
      name: item.name,
      sizeKb: item.sizeKb,
      sentAt: item.sentAt ?? null,
    })),
    messages: dto.messages.map(requestMessageFromDTO),
  }
}

/**
 * `status` separa publicar de guardar rascunho. No rascunho os campos podem
 * estar pela metade, entao nada aqui presume que a validacao ja passou.
 */
export function draftToDTO(
  draft: OpportunityDraft,
  status: 'ATIVA' | 'RASCUNHO' = 'ATIVA',
): CreateOpportunityRequestDTO {
  const hasAddress = requiresAddress(draft.modality)
  return {
    status,
    title: draft.title.trim(),
    serviceType: draft.serviceType,
    audiences: [...draft.audiences],
    description: draft.description.trim(),
    specialty: draft.specialtyId ?? '',
    modality: draft.modality ?? 'presencial',
    cep: hasAddress ? formatCep(draft.cep) : null,
    address: hasAddress ? draft.address.trim() : null,
    accessMode: draft.accessMode ?? 'gratuito',
    price: allowsPrice(draft.accessMode) ? parsePrice(draft.price) : null,
    totalVacancies: parseVacancies(draft.totalVacancies) ?? 0,
    opensAt: draft.opensAt,
    closesAt: draft.closesAt,
    eligibility: draft.hasNoRestrictions ? null : draft.eligibility.trim(),
    noRestrictions: draft.hasNoRestrictions,
    contactMethod: draft.contactMethod,
    triage: {
      mode: draft.triageMode,
      questions: draft.questions
        .filter((item) => item.label.trim() !== '')
        .map((item) => ({
          id: item.id,
          label: item.label.trim(),
          type: item.type,
          required: item.isRequired,
          options: [...item.options],
        })),
      documents: selectedDocuments(draft).map((item) => ({
        id: item.id,
        label: item.label.trim(),
      })),
    },
  }
}

/**
 * Carrega uma oportunidade no formulario de edicao. A API ainda nao devolve
 * a triagem junto da oportunidade, entao a edicao parte do formulario padrao
 * ate esse campo existir no contrato.
 */
export function draftFromManagedOpportunity(
  item: ManagedOpportunity,
): OpportunityDraft {
  return {
    ...emptyOpportunityDraft(),
    title: item.title,
    serviceType: item.serviceType,
    audiences: item.audiences,
    description: item.description,
    specialtyId: item.specialtyId === '' ? null : item.specialtyId,
    modality: item.modality,
    cep: item.cep ?? '',
    address: item.address ?? '',
    accessMode: item.accessMode,
    price: item.price === null ? '' : String(item.price).replace('.', ','),
    totalVacancies: item.totalVacancies > 0 ? String(item.totalVacancies) : '',
    opensAt: item.opensAt ?? '',
    closesAt: item.closesAt ?? '',
    eligibility: item.eligibility,
    hasNoRestrictions: item.hasNoRestrictions,
    contactMethod: item.contactMethod,
  }
}
